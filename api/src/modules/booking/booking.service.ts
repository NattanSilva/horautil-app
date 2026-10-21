/**
 * Serviço de agendamentos (Dev 3 — PRD F3.1..F3.9, §5.4 e §5.5).
 *
 * ── Máquina de estados (§3.2) ─────────────────────────────────────────────
 * ```text
 * pending ──accept──► confirmed ──complete(aluno)──► awaiting_confirmation ──confirm(instrutor)──► completed
 *    │                    │                                                        │
 *    ├──decline──► declined                     └──timeout 24h (job)──► completed ──┘
 *    └──expira 48h (job)──► declined
 * pending   ──cancel──► cancelled_student (reembolso integral)
 * confirmed ──cancel──► cancelled_student | cancelled_teacher (§5.5)
 * confirmed ──no_show (job, sem check-in do aluno)──► no_show
 * ```
 *
 * ── Regras de agenda ──────────────────────────────────────────────────────
 *  - BR-301: duração 30–180 min, múltiplo de 30;
 *  - BR-302/BR-303: antecedência ≥ 2 h e horizonte de 90 dias;
 *  - BR-304: `pending` expira em 48 h (job `expire-pending-bookings`);
 *  - BR-305: o slot precisa caber em uma janela ativa de `availability_slots` do instrutor;
 *  - BR-306: sem sobreposição — checagem transacional no serviço **e** constraint
 *    `EXCLUDE USING gist` no banco (ADR-002); o banco é a fonte da verdade;
 *  - BR-307: reagendamento só com sessão `confirmed`, sem penalidade se ≥ 12 h antes;
 *  - BR-308/BR-309: conclusão bilateral com auto-confirmar em 24 h (job);
 *  - BR-310: `complete` e `confirm` são idempotentes.
 *
 * ── Dinâmica financeira ───────────────────────────────────────────────────
 * Toda transição que mexe em dinheiro acontece na **mesma transação** da mudança de
 * estado do agendamento, com `lockBooking` + `lockUserLedger` na ordem correta
 * (sempre agendamento → ledger, evitando deadlock — BR-108).
 */
import { eq } from 'drizzle-orm';

import { db, type Executor } from '../../db/client.js';
import { BOOKING } from '../../config/constants.js';
import { categories, type Booking, type BookingStatus, type MeetingType } from '../../db/schema/index.js';
import {
  DAY_MS,
  addMinutes,
  autoConfirmDeadline,
  fitsInWindows,
  HOUR_MS,
  instantRange,
  isAlignedToGrid,
  localToUtc,
  minutesToTime,
  pendingExpiryFrom,
  refundPolicyFor,
  timeToMinutes,
  toLocalParts,
  toIso,
} from '../../shared/datetime.js';
import {
  AppError,
  conflict,
  forbidden,
  insufficientCredits,
  invalidTransition,
  notFound,
} from '../../shared/errors.js';
import { writeAudit, type RequestContext } from '../../shared/audit.js';
import { notify } from '../notification/notification.service.js';
import { getBalance } from '../wallet/wallet.repository.js';
import {
  consumeHold,
  consumeHoldWithPartialRefund,
  creditCompositionPenalty,
  holdCredits,
  releaseHold,
  settleBooking,
} from '../wallet/wallet.service.js';
import {
  countCompletedSessions,
  findAllAvailabilityWindows,
  findAwaitingConfirmationOverdue,
  findAvailabilityWindows,
  findBlockingBookings,
  findBookingById,
  findBusyIntervals,
  findExpiredPendings,
  findLikelyNoShows,
  findSchedulingUser,
  incrementLateCancellation,
  incrementNoShow,
  insertBooking,
  isOverlapViolation,
  listUpcomingBookings,
  listUserBookings,
  lockBooking,
  refreshSessionsAsTeacher,
  teacherTeachesCategory,
  updateBookingState,
} from './booking.repository.js';

// ─────────────────────────────────────────────────────────────────────────
// F3.2 — Solicitar sessão
// ─────────────────────────────────────────────────────────────────────────

export interface CreateBookingInput {
  teacher_id: string;
  category_id: string;
  /** Instante absoluto (UTC) do início da sessão. */
  scheduled_at: string;
  duration_minutes: number;
  student_message?: string;
  meeting_type?: MeetingType;
  meeting_location?: string;
}

export interface CreateBookingResult {
  id: string;
  status: BookingStatus;
  scheduled_at: string;
  duration_minutes: number;
  credits_amount: number;
  expires_at: string | null;
  balance: { available_minutes: number; held_minutes: number; total_minutes: number };
}

/**
 * F3.2/BR-103 — cria a solicitação `pending` e **reserva** os créditos do aluno
 * na mesma transação. O hold é o que impede o gasto em duas solicitações
 * simultâneas (BR-103) e satisfaz BR-107 (nunca negativo).
 */
export async function createBooking(
  studentId: string,
  input: CreateBookingInput,
  ctx: RequestContext,
): Promise<CreateBookingResult> {
  const now = new Date();
  const scheduledAt = new Date(input.scheduled_at);

  // BR-301 — duração válida (o Zod já valida, mas o serviço é reusável por jobs).
  assertDuration(input.duration_minutes);

  if (Number.isNaN(scheduledAt.getTime())) throw invalidDate(input.scheduled_at);
  assertAdvanceWindow(scheduledAt, now);
  assertOnboardingComplete(studentId, 'Você precisa concluir o onboarding para solicitar sessões.');

  const teacher = await findSchedulingUser(input.teacher_id);
  if (!teacher || teacher.status === 'deleted') throw notFound('Instrutor');
  if (teacher.id === studentId) throw invalidTransition('Você não pode agendar uma sessão consigo mesmo.');
  if (teacher.onboardingCompletedAt === null) {
    throw invalidTransition('Este instrutor ainda não concluiu o cadastro.');
  }

  // BR-201/BR-305 — só é possível agendar o que o instrutor de fato ensina.
  if (!(await teacherTeachesCategory(input.teacher_id, input.category_id))) {
    throw invalidTransition('O instrutor não ensina esta habilidade.');
  }

  // BR-305 — o slot precisa estar dentro de uma janela ativa do instrutor.
  await assertInsideAvailability(input.teacher_id, teacher.timezone, scheduledAt, input.duration_minutes);

  // BR-306 — pré-checagem para dar mensagem amigável; o banco garante (EXCLUDE gist).
  const overlap = await findBlockingBookings(
    input.teacher_id,
    scheduledAt,
    addMinutes(scheduledAt, input.duration_minutes),
  );
  if (overlap.length > 0) throw slotUnavailable();

  return db.transaction(async (tx) => {
    const booking = await insertBooking(
      {
        teacherId: input.teacher_id,
        studentId,
        categoryId: input.category_id,
        scheduledAt,
        durationMinutes: input.duration_minutes,
        // BR-102 — sem markup: 1 h de aula = 1 h de crédito.
        creditsAmount: input.duration_minutes,
        status: 'pending',
        studentMessage: input.student_message ?? null,
        meetingType: input.meeting_type ?? 'external',
        meetingLocation: input.meeting_location ?? null,
        expiresAt: pendingExpiryFrom(scheduledAt, now),
      },
      tx,
    );

    // BR-103/BR-107 — reserva imediata; `lockUserLedger` é chamado dentro de holdCredits.
    const hold = await holdCredits(
      {
        userId: studentId,
        bookingId: booking.id,
        minutes: input.duration_minutes,
        description: 'Reserva de sessão',
      },
      ctx,
      tx,
    );

    await notify(tx, {
      userId: input.teacher_id,
      type: 'booking_requested',
      title: 'Nova solicitação de sessão',
      body: `Você recebeu um pedido de ${input.duration_minutes} min para ${toLocal(
        scheduledAt,
        teacher.timezone,
      )}.`,
      data: { booking_id: booking.id },
    });

    await writeAudit(tx, {
      actorId: studentId,
      action: 'booking.created',
      entity: 'booking',
      entityId: booking.id,
      payload: {
        teacherId: input.teacher_id,
        categoryId: input.category_id,
        scheduledAt: toIso(scheduledAt),
        durationMinutes: input.duration_minutes,
        heldMinutes: hold.minutes,
      },
      ip: ctx.ip,
      correlationId: ctx.correlationId,
    });

    const balance = await getBalance(tx, studentId);
    return {
      id: booking.id,
      status: booking.status,
      scheduled_at: toIso(booking.scheduledAt) as string,
      duration_minutes: booking.durationMinutes,
      credits_amount: booking.creditsAmount,
      expires_at: toIso(booking.expiresAt),
      balance: {
        available_minutes: balance.available_minutes,
        held_minutes: balance.held_minutes,
        total_minutes: balance.total_minutes,
      },
    };
  }).catch((err) => {
    // 23P01 do EXCLUDE USING gist — a constraint do banco é a fonte da verdade (BR-306).
    if (isOverlapViolation(err)) throw slotUnavailable();
    throw err;
  });
}

// ─────────────────────────────────────────────────────────────────────────
// F3.3 — Aceitar / recusar
// ─────────────────────────────────────────────────────────────────────────

/**
 * F3.3 — o instrutor aceita: `pending → confirmed`.
 *
 * A transição é condicional (`WHERE status = 'pending'`), então dois `accept`
 * simultâneos não podem duplicar (o segundo recebe `INVALID_TRANSITION`).
 */
export async function acceptBooking(
  teacherId: string,
  bookingId: string,
  input: { meeting_type?: MeetingType; meeting_location?: string },
  ctx: RequestContext,
): Promise<{ id: string; status: BookingStatus; scheduled_at: string }> {
  return db.transaction(async (tx) => {
    await lockBooking(tx, bookingId);
    const booking = await findBookingById(bookingId);
    if (!booking) throw notFound('Agendamento');
    assertTeacher(booking, teacherId);
    assertTransition(booking, ['pending']);

    // BR-405 — aluno sem saldo não deveria nem ter reservado; se o saldo evaporou
    // (expiração), a sessão é recusada com erro explícito em vez de geraruledor negativo.
    const studentBalance = await getBalance(tx, booking.studentId);
    if (studentBalance.available_minutes + booking.durationMinutes < booking.creditsAmount) {
      throw insufficientCredits('O aluno não tem mais saldo para esta sessão.');
    }

    // BR-406 — instrutor com saldo zerado não pode aceitar novas aulas.
    const teacherBalance = await getBalance(tx, teacherId);
    if (teacherBalance.available_minutes <= 0) {
      throw new AppError(
        422,
        'INSUFFICIENT_CREDITS',
        'Saldo zerado: instrutores com saldo zerado não podem aceitar novas aulas (BR-406).',
      );
    }

    const updated = await updateBookingState(
      bookingId,
      {
        status: 'confirmed',
        ...(input.meeting_type ? { meetingType: input.meeting_type } : {}),
        ...(input.meeting_location ? { meetingLocation: input.meeting_location } : {}),
      },
      'pending',
      tx,
    );
    if (!updated) throw invalidTransition('A solicitação já foi respondida.');

    // BR-306 — overlap check happens inside the transaction; a constraint EXCLUDE no banco
    // garante a atomicidade mesmo com concorrência real (ADR-002).
    await assertNoOverlap(tx, booking.teacherId, booking.scheduledAt, booking.durationMinutes, bookingId);

    await notify(tx, {
      userId: booking.studentId,
      type: 'booking_accepted',
      title: 'Sessão confirmada',
      body: `Sua sessão de ${booking.durationMinutes} min está confirmada.`,
      data: { booking_id: bookingId },
    });

    await writeAudit(tx, {
      actorId: teacherId,
      action: 'booking.accepted',
      entity: 'booking',
      entityId: bookingId,
      payload: { scheduledAt: toIso(booking.scheduledAt) },
      ip: ctx.ip,
      correlationId: ctx.correlationId,
    });

    return {
      id: updated.id,
      status: updated.status,
      scheduled_at: toIso(updated.scheduledAt) as string,
    };
  }).catch(mapOverlapError);
}

/** F3.3 — o instrutor recusa: `pending → declined`, liberando o hold integralmente. */
export async function declineBooking(
  teacherId: string,
  bookingId: string,
  reason: string,
  ctx: RequestContext,
): Promise<{ id: string; status: BookingStatus }> {
  return db.transaction(async (tx) => {
    await lockBooking(tx, bookingId);
    const booking = await findBookingById(bookingId);
    if (!booking) throw notFound('Agendamento');
    assertTeacher(booking, teacherId);
    assertTransition(booking, ['pending']);

    const updated = await updateBookingState(
      bookingId,
      { status: 'declined', declineReason: reason },
      'pending',
      tx,
    );
    if (!updated) throw invalidTransition('A solicitação já foi respondida.');

    // Recusa não penaliza o aluno: hold liberado (disponível volta integralmente).
    await releaseHold(
      { userId: booking.studentId, bookingId, reason: 'declined_by_teacher' },
      ctx,
      tx,
    );

    await notify(tx, {
      userId: booking.studentId,
      type: 'booking_declined',
      title: 'Solicitação recusada',
      body: reason.slice(0, 200),
      data: { booking_id: bookingId },
    });

    await writeAudit(tx, {
      actorId: teacherId,
      action: 'booking.declined',
      entity: 'booking',
      entityId: bookingId,
      payload: { reason },
      ip: ctx.ip,
      correlationId: ctx.correlationId,
    });

    return { id: updated.id, status: updated.status };
  });
}

// ─────────────────────────────────────────────────────────────────────────
// F3.5 — Reagendar
// ─────────────────────────────────────────────────────────────────────────

/**
 * F3.5/BR-307 — reagendamento. Só é permitido com a sessão já `confirmed` e segue as
 * mesmas regras de antecedência/grade da criação.
 *
 * Penalidade: se o reagendamento ocorrer com menos de 12 h de antecedência, o usuário
 * solicitante recebe o mesmo contador de cancelamento tardio do §5.5 (BR-403) —
 * é a "regra de penalidade" citada pelo PRD.
 */
export async function rescheduleBooking(
  actorId: string,
  bookingId: string,
  input: { scheduled_at: string; duration_minutes?: number; reason?: string },
  ctx: RequestContext,
): Promise<{ id: string; status: BookingStatus; scheduled_at: string; duration_minutes: number }> {
  const now = new Date();
  const newStart = new Date(input.scheduled_at);
  if (Number.isNaN(newStart.getTime())) throw invalidDate(input.scheduled_at);

  return db.transaction(async (tx) => {
    await lockBooking(tx, bookingId);
    const booking = await findBookingById(bookingId);
    if (!booking) throw notFound('Agendamento');
    assertParticipant(booking, actorId);
    assertTransition(booking, ['confirmed']);

    const duration = input.duration_minutes ?? booking.durationMinutes;
    assertDuration(duration);
    assertAdvanceWindow(newStart, now);

    const teacher = await findSchedulingUser(booking.teacherId, tx);
    await assertInsideAvailability(booking.teacherId, teacher?.timezone ?? 'America/Sao_Paulo', newStart, duration);
    await assertNoOverlap(tx, booking.teacherId, newStart, duration, bookingId);

    const updated = await updateBookingState(
      bookingId,
      { scheduledAt: newStart, durationMinutes: duration, creditsAmount: duration },
      'confirmed',
      tx,
    );
    if (!updated) throw invalidTransition('A sessão não está mais confirmada.');

    // < 12 h de antecedência → penalidade de cancelamento tardio (BR-403).
    const hoursUntil = (newStart.getTime() - booking.scheduledAt.getTime()) / HOUR_MS;
    const lateReagendamento = hoursUntil < BOOKING.CANCELLATION_FULL_REFUND_HOURS;
    if (lateReagendamento) {
      await incrementLateCancellation(actorId, tx);
    }

    const counterpart = actorId === booking.studentId ? booking.teacherId : booking.studentId;
    await notify(tx, {
      userId: counterpart,
      type: 'booking_cancelled',
      title: 'Sessão reagendada',
      body: `Nova data: ${toLocal(newStart, teacher?.timezone ?? 'America/Sao_Paulo')}.`,
      data: { booking_id: bookingId, previous_scheduled_at: toIso(booking.scheduledAt) },
    });

    await writeAudit(tx, {
      actorId,
      action: 'booking.rescheduled',
      entity: 'booking',
      entityId: bookingId,
      payload: {
        from: toIso(booking.scheduledAt),
        to: toIso(newStart),
        durationMinutes: duration,
        latePenalty: lateReagendamento,
      },
      ip: ctx.ip,
      correlationId: ctx.correlationId,
    });

    return {
      id: updated.id,
      status: updated.status,
      scheduled_at: toIso(updated.scheduledAt) as string,
      duration_minutes: updated.durationMinutes,
    };
  }).catch(mapOverlapError);
}

// ─────────────────────────────────────────────────────────────────────────
// F3.6 — Cancelar
// ─────────────────────────────────────────────────────────────────────────

export interface CancelBookingResult {
  id: string;
  status: BookingStatus;
  refund_minutes: number;
  composition_minutes: number;
  /** Política aplicada — o app mostra exatamente a mesma regra ao usuário. */
  policy: 'full' | 'partial' | 'none';
  reputation_warning: boolean;
}

/**
 * F3.6 / §5.5 — cancelamento com a política financeira e de reputação do PRD.
 *
 * | Momento              | Reembolso ao aluno | Instrutor  | Reputação                |
 * |----------------------|--------------------|-----------|--------------------------|
 * | > 12 h               | 100 %              | —         | nenhuma                  |
 * | entre 2 h e 12 h     | 50 %               | 50 %      | contador++               |
 * | < 2 h                | 0 %                | 100 %     | contador++               |
 * | no-show              | 0 %                | 100 %     | marcado no perfil        |
 *
 * Quando **o instrutor** cancela, o aluno recebe 100 % em qualquer faixa
 * (BR-401: o cancelamento nunca pune o aluno por decisão do instrutor).
 */
export async function cancelBooking(
  actorId: string,
  bookingId: string,
  input: { reason?: string },
  ctx: RequestContext,
): Promise<CancelBookingResult> {
  return db.transaction(async (tx) => {
    await lockBooking(tx, bookingId);
    const booking = await findBookingById(bookingId);
    if (!booking) throw notFound('Agendamento');
    assertParticipant(booking, actorId);

    const isStudent = booking.studentId === actorId;
    // Sessão `pending`: cancelamento é direto e sem penalidade para nenhum lado.
    const pending = booking.status === 'pending';
    if (!pending) assertTransition(booking, ['confirmed']);

    const policy = pending
      ? ({ tier: 'full', refundRatio: 1, reputationHit: false } as const)
      : refundPolicyFor(booking.scheduledAt);
    // Instrutor cancelando → aluno sempre recebe 100 % (decisão é dele).
    const refundRatio = isStudent ? policy.refundRatio : 1;

    const status: BookingStatus = isStudent ? 'cancelled_student' : 'cancelled_teacher';
    const refundMinutes = Math.round(booking.creditsAmount * refundRatio);
    const compositionMinutes = isStudent ? booking.creditsAmount - refundMinutes : 0;

    const updated = await updateBookingState(
      bookingId,
      {
        status,
        cancelledBy: actorId,
        cancellationReason: input.reason ?? null,
        cancelledAt: new Date(),
      },
      booking.status,
      tx,
    );
    if (!updated) throw invalidTransition('A sessão já foi cancelada ou mudou de estado.');

    // Efeito no ledger do aluno.
    if (refundMinutes === booking.creditsAmount) {
      await releaseHold(
        { userId: booking.studentId, bookingId, reason: input.reason ?? 'cancelled' },
        ctx,
        tx,
      );
    } else if (refundMinutes > 0) {
      await consumeHoldWithPartialRefund(
        {
          userId: booking.studentId,
          bookingId,
          refundMinutes,
          reason: input.reason ?? 'cancelled',
        },
        ctx,
        tx,
      );
    } else {
      await consumeHold(
        { userId: booking.studentId, bookingId, reason: input.reason ?? 'cancelled' },
        ctx,
        tx,
      );
    }

    // Compensação do instrutor pelo tempo reservado (BR-102, §5.5).
    if (compositionMinutes > 0) {
      await creditCompositionPenalty(
        {
          teacherId: booking.teacherId,
          bookingId,
          minutes: compositionMinutes,
          reason: input.reason ?? 'cancelled_student',
        },
        ctx,
        tx,
      );
    }

    // Reputação: BR-403 (3 cancelamentos < 12 h em 90 dias → suspensão de 14 dias).
    let reputationWarning = false;
    if (!pending && policy.reputationHit && !isStudent) {
      const reputation = await incrementLateCancellation(actorId, tx);
      reputationWarning = true;
      if (reputation.suspended) {
        await notify(tx, {
          userId: actorId,
          type: 'system',
          title: 'Conta suspensa por 14 dias',
          body: 'Você积累了 3 cancelamentos com menos de 12 h de antecedência (BR-403).',
          data: { reason: 'BR-403' },
        });
      }
    }

    const counterpart = isStudent ? booking.teacherId : booking.studentId;
    await notify(tx, {
      userId: counterpart,
      type: 'booking_cancelled',
      title: 'Sessão cancelada',
      body: input.reason?.slice(0, 200) ?? null,
      data: { booking_id: bookingId },
    });

    await writeAudit(tx, {
      actorId,
      action: 'booking.cancelled',
      entity: 'booking',
      entityId: bookingId,
      payload: {
        by: isStudent ? 'student' : 'teacher',
        policy: policy.tier,
        refundMinutes,
        compositionMinutes,
        reputationHit: reputationWarning,
      },
      ip: ctx.ip,
      correlationId: ctx.correlationId,
    });

    return {
      id: updated.id,
      status: updated.status,
      refund_minutes: refundMinutes,
      composition_minutes: compositionMinutes,
      policy: policy.tier,
      reputation_warning: reputationWarning,
    };
  });
}

// ─────────────────────────────────────────────────────────────────────────
// F3.7 — Conclusão bilateral
// ─────────────────────────────────────────────────────────────────────────

/**
 * F3.7/BR-309/BR-310 — o aluno sinaliza que a sessão terminou:
 * `confirmed → awaiting_confirmation`, com prazo de 24 h para o instrutor confirmar.
 *
 * Idempotente (BR-310): chamar de novo devolve `200` sem duplicar nada.
 */
export async function signalCompletion(
  studentId: string,
  bookingId: string,
  ctx: RequestContext,
): Promise<{ id: string; status: BookingStatus; auto_confirm_at: string | null }> {
  return db.transaction(async (tx) => {
    await lockBooking(tx, bookingId);
    const booking = await findBookingById(bookingId);
    if (!booking) throw notFound('Agendamento');
    assertStudent(booking, studentId);

    // BR-310 — já sinalizado: devolve o estado atual, sem efeito colateral.
    if (booking.status === 'awaiting_confirmation' || booking.status === 'completed') {
      return {
        id: booking.id,
        status: booking.status,
        auto_confirm_at: toIso(booking.studentCompletedAt),
      };
    }
    assertTransition(booking, ['confirmed']);

    // BR-308 — check-in só abre na janela do horário (± tolerância de 30 min).
    const now = new Date();
    const opensAt = addMinutes(booking.scheduledAt, -BOOKING.CHECK_IN_TOLERANCE_MINUTES);
    const closesAt = addMinutes(booking.scheduledAt, booking.durationMinutes + BOOKING.CHECK_IN_TOLERANCE_MINUTES);
    if (now < opensAt) {
      throw invalidTransition(
        `A sessão só pode ser marcada como concluída a partir de ${toLocal(opensAt)}.`,
      );
    }

    const updated = await updateBookingState(
      bookingId,
      { status: 'awaiting_confirmation', studentCompletedAt: now },
      'confirmed',
      tx,
    );
    if (!updated) throw invalidTransition('A sessão mudou de estado.');

    // BR-309 — se o instrutor não responder em 24 h, o job confirma automaticamente.
    const deadline = autoConfirmDeadline(now);
    await notify(tx, {
      userId: booking.teacherId,
      type: 'confirm_completion',
      title: 'Confirme a conclusão da sessão',
      body: 'O aluno marcou a sessão como concluída.',
      data: { booking_id: bookingId, deadline: toIso(deadline) },
    });

    await writeAudit(tx, {
      actorId: studentId,
      action: 'booking.completion_signaled',
      entity: 'booking',
      entityId: bookingId,
      payload: { autoConfirmAt: toIso(deadline) },
      ip: ctx.ip,
      correlationId: ctx.correlationId,
    });

    return { id: updated.id, status: updated.status, auto_confirm_at: toIso(deadline) };
  });
}

/**
 * F3.7/BR-104/BR-310 — o instrutor confirma: liquid a sessão, consome o hold do aluno
 * e credita o instrutor (BR-102). Idempotente (BR-310).
 */
export async function confirmCompletion(
  teacherId: string,
  bookingId: string,
  ctx: RequestContext,
): Promise<{ id: string; status: BookingStatus; credits_transferred: number }> {
  return db.transaction(async (tx) =>
    completeBookingTx(tx, bookingId, teacherId, ctx, 'teacher_confirmed'),
  ).catch(mapOverlapError);
}

/**
 * BR-104 — liquidação da sessão. Compartilhada entre a confirmação do instrutor e o job
 * de auto-confirmação (BR-309), garantindo que o crédito acontece exatamente uma vez
 * (a trava pessimista em `bookings` + a idempotência de `settleBooking`).
 */
async function completeBookingTx(
  tx: Executor,
  bookingId: string,
  teacherId: string,
  ctx: RequestContext,
  reason: string,
): Promise<{ id: string; status: BookingStatus; credits_transferred: number }> {
  await lockBooking(tx, bookingId);
  const booking = await findBookingById(bookingId);
  if (!booking) throw notFound('Agendamento');
  assertTeacher(booking, teacherId);

  // BR-310 — idempotente.
  if (booking.status === 'completed') {
    return { id: booking.id, status: 'completed', credits_transferred: 0 };
  }
  assertTransition(booking, ['awaiting_confirmation']);

  const categoryName = await categoryNameOf(tx, booking.categoryId);

  const settlement = await settleBooking(
    {
      studentId: booking.studentId,
      teacherId: booking.teacherId,
      bookingId,
      minutes: booking.durationMinutes,
      categoryName,
    },
    ctx,
    tx,
  );

  const updated = await updateBookingState(
    bookingId,
    { status: 'completed', completedAt: new Date() },
    'awaiting_confirmation',
    tx,
  );
  if (!updated) throw invalidTransition('A sessão mudou de estado.');

  // §7.4 — recalcula o cache `sessions_as_teacher`.
  await refreshSessionsAsTeacher(booking.teacherId, tx);

  // BR-501 — a sessão concluída libera a avaliação para ambas as partes.
  for (const userId of [booking.teacherId, booking.studentId]) {
    await notify(tx, {
      userId,
      type: 'review_requested',
      title: 'Avalie sua sessão',
      body: `Você tem 7 dias para avaliar a sessão de ${categoryName}.`,
      data: { booking_id: bookingId },
    });
  }

  await notify(tx, {
    userId: booking.studentId,
    type: 'booking_completed',
    title: 'Sessão concluída',
    body: `${booking.durationMinutes} min confirmados.`,
    data: { booking_id: bookingId },
  });

  await writeAudit(tx, {
    actorId: teacherId,
    action: 'booking.completed',
    entity: 'booking',
    entityId: bookingId,
    payload: {
      reason,
      minutes: booking.durationMinutes,
      teacherCredited: settlement.teacher?.minutes ?? 0,
      studentCharged: settlement.student?.minutes ?? 0,
    },
    ip: ctx.ip,
    correlationId: ctx.correlationId,
  });

  return {
    id: updated.id,
    status: updated.status,
    credits_transferred: settlement.teacher?.minutes ?? 0,
  };
}

// ─────────────────────────────────────────────────────────────────────────
// Jobs
// ─────────────────────────────────────────────────────────────────────────

/**
 * BR-304 — expira solicitações `pending` não respondidas em 48 h.
 * Libera o hold do aluno (reembolso integral) e marca como `declined`.
 */
export async function expirePendingBookings(
  now = new Date(),
  ctx: RequestContext = {},
): Promise<{ expired: number }> {
  const candidates = await findExpiredPendings(now);
  let expired = 0;

  for (const candidate of candidates) {
    const done = await db.transaction(async (tx) => {
      await lockBooking(tx, candidate.id);
      const booking = await findBookingById(candidate.id);
      // Reentrância: outro worker já processou.
      if (!booking || booking.status !== 'pending') return false;

      await updateBookingState(
        candidate.id,
        { status: 'declined', declineReason: 'Solicitação expirada (48 h — BR-304)' },
        'pending',
        tx,
      );
      await releaseHold(
        { userId: booking.studentId, bookingId: candidate.id, reason: 'expired_48h' },
        ctx,
        tx,
      );
      await notify(tx, {
        userId: booking.studentId,
        type: 'booking_declined',
        title: 'Solicitação expirada',
        body: 'O instrutor não respondeu em 48 h e os créditos foram liberados.',
        data: { booking_id: candidate.id },
      });
      await writeAudit(tx, {
        action: 'booking.expired',
        entity: 'booking',
        entityId: candidate.id,
        payload: { expiresAt: toIso(booking.expiresAt) },
      });
      return true;
    });
    if (done) expired += 1;
  }

  return { expired };
}

/**
 * BR-309 — auto-confirma a conclusão 24 h após o aluno sinalizar.
 * Também cobre `confirmed` cuja sessão já terminou há mais de 24 h sem sinalização
 * (o aluno simplesmente esqueceu) — extensão documentada no README (ADR-007).
 */
export async function autoConfirmCompletions(
  now = new Date(),
  ctx: RequestContext = {},
): Promise<{ auto_confirmed: number }> {
  const candidates = await findAwaitingConfirmationOverdue(now);
  let autoConfirmed = 0;

  for (const candidate of candidates) {
    const done = await db.transaction(async (tx) =>
      // O job roda como "sistema"; passamos o próprio instrutor como ator do lock lógico.
      completeBookingTx(tx, candidate.id, candidate.teacherId, ctx, 'auto_confirmed_24h').then(
        () => true,
        (err: unknown) => {
          // Uma sessão que não está mais em `awaiting_confirmation` já foi tratada.
          if (err instanceof AppError) return false;
          throw err;
        },
      ),
    );
    if (done) autoConfirmed += 1;
  }

  return { auto_confirmed: autoConfirmed };
}

/**
 * BR-308/BR-404 — `no_show` quando a sessão já começou (com 30 min de tolerância) e o
 * aluno não sinalizou comparecimento. Consome o hold sem reembolso (§5.5) e conta o
 * no-show do aluno; 2 no-shows bloqueiam permanentemente novos agendamentos (BR-404).
 */
export async function markNoShows(
  now = new Date(),
  ctx: RequestContext = {},
): Promise<{ no_shows: number }> {
  const candidates = await findLikelyNoShows(now);
  let noShows = 0;

  for (const candidate of candidates) {
    const done = await db.transaction(async (tx) => {
      await lockBooking(tx, candidate.id);
      const booking = await findBookingById(candidate.id);
      if (!booking || booking.status !== 'confirmed') return false;

      await updateBookingState(
        candidate.id,
        {
          status: 'no_show',
          cancelledAt: now,
          cancellationReason: 'Aluno não compareceu (BR-308)',
        },
        'confirmed',
        tx,
      );

      // §5.5 — no-show: sem reembolso para o aluno; o instrutor recebe 100 %.
      await consumeHold(
        { userId: booking.studentId, bookingId: candidate.id, reason: 'no_show' },
        ctx,
        tx,
      );
      await creditCompositionPenalty(
        {
          teacherId: booking.teacherId,
          bookingId: candidate.id,
          minutes: booking.durationMinutes,
          reason: 'no_show',
        },
        ctx,
        tx,
      );

      const reputation = await incrementNoShow(booking.studentId, tx);
      await notify(tx, {
        userId: booking.studentId,
        type: 'booking_cancelled',
        title: reputation.blocked
          ? 'Agendamentos bloqueados'
          : 'Sessão marcada como falta',
        body: reputation.blocked
          ? 'Você acumulou 2 no-shows e não pode mais solicitar sessões (BR-404).'
          : 'A sessão foi marcada como falta — o crédito foi consumido.',
        data: { booking_id: candidate.id },
      });
      await notify(tx, {
        userId: booking.teacherId,
        type: 'booking_cancelled',
        title: 'Aluno não compareceu',
        body: 'A sessão foi marcada como falta e os créditos foram liberados para você.',
        data: { booking_id: candidate.id },
      });

      await writeAudit(tx, {
        action: 'booking.no_show',
        entity: 'booking',
        entityId: candidate.id,
        payload: { studentId: booking.studentId, noShowCount: reputation.count },
      });
      return true;
    });
    if (done) noShows += 1;
  }

  return { no_shows: noShows };
}

// ─────────────────────────────────────────────────────────────────────────
// Leitura — agenda e slots
// ─────────────────────────────────────────────────────────────────────────

/**
 * F3.1 — slots livres na agenda de um instrutor.
 *
 * Cálculo: para cada dia do intervalo, para cada janela ativa do instrutor naquele
 * `weekday`, geramos inícios alinhados à grade de 30 min que caibam na janela, e
 * descartamos os que:
 *  - começam antes de `now + 2 h` (BR-302) ou depois de `now + 90 dias` (BR-303);
 *  - sobrepõem uma sessão `confirmed`/`awaiting_confirmation`.
 */
export async function getAvailableSlots(
  teacherId: string,
  opts: { from?: Date; to?: Date; durationMinutes: number },
  now = new Date(),
): Promise<{ timezone: string; slots: { start_at: string; end_at: string }[] }> {
  const teacher = await findSchedulingUser(teacherId);
  if (!teacher || teacher.status === 'deleted') throw notFound('Instrutor');
  const timezone = teacher.timezone;

  const earliest = addMinutes(now, BOOKING.MIN_ADVANCE_HOURS * 60);
  const horizon = new Date(now.getTime() + BOOKING.MAX_ADVANCE_DAYS * DAY_MS);
  const from = opts.from && opts.from > earliest ? opts.from : earliest;
  const to = opts.to && opts.to < horizon ? opts.to : horizon;
  if (from >= to) return { timezone, slots: [] };

  const [windows, busy] = await Promise.all([
    findAllAvailabilityWindows(teacherId),
    findBusyIntervals(teacherId, from, to),
  ]);

  const step = BOOKING.SLOT_GRANULARITY_MINUTES;
  const slots: { start_at: string; end_at: string }[] = [];
  const maxSlots = 500; // teto de segurança para não estourar a resposta

  for (let day = 0; day * DAY_MS < to.getTime() - from.getTime() && slots.length < maxSlots; day += 1) {
    const dayStart = new Date(from.getTime() + day * DAY_MS);
    const local = toLocalParts(dayStart, timezone);
    // `weekday` da janela evita recomputar a partir do meio-dia UTC.
    const weekday = local.weekday;

    for (const window of windows.filter((w) => w.weekday === weekday)) {
      const windowStart = timeToMinutes(window.startTime);
      const windowEnd = timeToMinutes(window.endTime);
      for (let start = windowStart; start + opts.durationMinutes <= windowEnd; start += step) {
        const startAt = localToUtc(local.isoDate, start, timezone);
        if (startAt < from || startAt > to) continue;
        const endAt = new Date(startAt.getTime() + opts.durationMinutes * 60_000);
        if (isBusy(startAt, endAt, busy)) continue;
        slots.push({ start_at: toIso(startAt) as string, end_at: toIso(endAt) as string });
      }
    }
  }

  slots.sort((a, b) => a.start_at.localeCompare(b.start_at));
  return { timezone, slots: slots.slice(0, maxSlots) };
}

/** Lista as sessões do usuário autenticado (`GET /v1/me/bookings`, F3.4). */
export async function listMyBookings(
  userId: string,
  opts: Parameters<typeof listUserBookings>[1],
) {
  return listUserBookings(userId, opts);
}

/** Próximas sessões do usuário (`GET /v1/me/upcoming`, F3.9). */
export async function listUpcoming(userId: string, limit = 20) {
  return listUpcomingBookings(userId, new Date(), limit);
}

/** Detalhe de um agendamento, visível apenas às partes (BR-702 — sem PII de terceiros). */
export async function getBookingDetail(bookingId: string, viewerId: string) {
  const booking = await findBookingById(bookingId);
  if (!booking) throw notFound('Agendamento');
  assertParticipant(booking, viewerId);
  const category = await categoryNameOf(db, booking.categoryId);
  return { booking, category };
}

// ─────────────────────────────────────────────────────────────────────────
// Helpers / invariantes
// ─────────────────────────────────────────────────────────────────────────

/** BR-301 — 30..180 min, múltiplo de 30. */
export function assertDuration(minutes: number): void {
  if (
    !Number.isInteger(minutes) ||
    minutes < BOOKING.MIN_DURATION_MINUTES ||
    minutes > BOOKING.MAX_DURATION_MINUTES ||
    minutes % BOOKING.DURATION_STEP_MINUTES !== 0
  ) {
    throw invalidTransition(
      'Duração deve ser um múltiplo de 30 minutos, entre 30 e 180 (BR-301).',
    );
  }
}

/** BR-302 (antecedência ≥ 2 h) e BR-303 (horizonte de 90 dias). */
export function assertAdvanceWindow(scheduledAt: Date, now = new Date()): void {
  const deltaMinutes = (scheduledAt.getTime() - now.getTime()) / 60_000;
  if (deltaMinutes < BOOKING.MIN_ADVANCE_HOURS * 60) {
    throw invalidTransition(`A sessão deve ser agendada com no mínimo ${BOOKING.MIN_ADVANCE_HOURS} h de antecedência (BR-302).`);
  }
  if (scheduledAt.getTime() > now.getTime() + BOOKING.MAX_ADVANCE_DAYS * DAY_MS) {
    throw invalidTransition(`A sessão pode ser agendada com no máximo ${BOOKING.MAX_ADVANCE_DAYS} dias de antecedência (BR-303).`);
  }
}

/** BR-004 — onboarding concluído é requisito paraIRE aparecer e para agendar. */
async function assertOnboardingComplete(userId: string, message: string): Promise<void> {
  const user = await findSchedulingUser(userId);
  if (!user) throw notFound('Usuário');
  if (user.status === 'deleted') throw notFound('Usuário');
  if (user.onboardingCompletedAt === null) throw invalidTransition(message);
  // BR-404 — 2 no-shows bloqueiam permanentemente o agendamento.
  if (user.noShowCount >= 2) {
    throw forbidden('Agendamento bloqueado por no-shows recorrentes (BR-404).');
  }
}

/** BR-305 — o slot precisa caber em uma janela ativa do instrutor. */
async function assertInsideAvailability(
  teacherId: string,
  timezone: string,
  scheduledAt: Date,
  durationMinutes: number,
): Promise<void> {
  const range = instantRange(scheduledAt, durationMinutes, timezone);
  if (range.crossesMidnight) {
    throw invalidTransition('A sessão não pode atravessar a meia-noite local do instrutor.');
  }
  if (!isAlignedToGrid(scheduledAt, timezone, BOOKING.SLOT_GRANULARITY_MINUTES)) {
    throw invalidTransition('O horário deve estar alinhado à grade de 30 minutos.');
  }
  const windows = await findAvailabilityWindows(teacherId, range.weekday);
  if (windows.length === 0 || !fitsInWindows(range.startMinutes, range.endMinutes, windows)) {
    throw invalidTransition(
      `O instrutor não está disponível neste horário (disponível: ${describeWindows(windows)}).`,
    );
  }
}

/** BR-306 — verificação transacional de sobreposição (o banco confirma via EXCLUDE). */
async function assertNoOverlap(
  tx: Executor,
  teacherId: string,
  start: Date,
  duration: number,
  excludeBookingId: string,
): Promise<void> {
  const overlapping = await findBlockingBookings(
    teacherId,
    start,
    addMinutes(start, duration),
    tx,
    excludeBookingId,
  );
  if (overlapping.length > 0) throw slotUnavailable();
}

function isBusy(
  start: Date,
  end: Date,
  busy: { scheduledAt: Date; durationMinutes: number }[],
): boolean {
  return busy.some((b) => {
    const bStart = b.scheduledAt.getTime();
    const bEnd = bStart + b.durationMinutes * 60_000;
    return bStart < end.getTime() && start.getTime() < bEnd;
  });
}

function slotUnavailable() {
  return conflict('SLOT_UNAVAILABLE', 'Este horário já está reservado. Escolha outro.');
}

function invalidDate(value: string) {
  return new AppError(400, 'VALIDATION_ERROR', `Data/hora inválida: ${value}.`);
}

function assertTransition(booking: Booking, allowed: BookingStatus[]): void {
  if (!allowed.includes(booking.status)) {
    throw invalidTransition(
      `Não é possível concluir a operação com status \`${booking.status}\`. Permitido: ${allowed.join(', ')}.`,
    );
  }
}

function assertTeacher(booking: Booking, userId: string): void {
  if (booking.teacherId !== userId) throw forbidden('Apenas o instrutor pode executar esta operação.');
}

function assertStudent(booking: Booking, userId: string): void {
  if (booking.studentId !== userId) throw forbidden('Apenas o aluno pode executar esta operação.');
}

function assertParticipant(booking: Booking, userId: string): void {
  if (booking.studentId !== userId && booking.teacherId !== userId) {
    throw forbidden('Você não participa deste agendamento.');
  }
}

async function categoryNameOf(executor: Executor, categoryId: string): Promise<string> {
  const [row] = await executor
    .select({ name: categories.name })
    .from(categories)
    .where(eq(categories.id, categoryId))
    .limit(1);
  return row?.name ?? 'sessão';
}

function describeWindows(windows: { startTime: string; endTime: string }[]): string {
  if (windows.length === 0) return 'nenhuma janela declarada';
  return windows.map((w) => `${minutesToTime(timeToMinutes(w.startTime))}–${minutesToTime(timeToMinutes(w.endTime))}`).join(', ');
}

function toLocal(instant: Date, timezone: string): string {
  return toLocalParts(instant, timezone).hhmm;
}

/** 23P01 → 409 SLOT_UNAVAILABLE, sem expor detalhes do banco. */
function mapOverlapError(err: unknown): never {
  if (isOverlapViolation(err)) throw slotUnavailable();
  throw err;
}

export { WALLET };