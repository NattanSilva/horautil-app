/**
 * Serviço de carteira/créditos (Dev 4 — PRD F4.1..F4.7, §5.2).
 *
 * ── Modelo contábil (ADR-001, ADR-006) ────────────────────────────────
 * O saldo **nunca** é coluna de `users`; é derivado do ledger. O sinal de um
 * lançamento vem do `type` (ver `CREDIT_TYPES` / `DEBIT_TYPES`), e `minutes` é sempre
 * positivo:
 *
 * ```text
 * available(u) = Σ posted( sign(type) * minutes )  −  Σ held( minutes )
 * total(u)     = Σ posted( sign(type) * minutes )   =  available(u) + held(u)
 * ```
 *
 * Ciclo de vida de uma reserva (ver README → ADR-006):
 *
 * | Evento                        | Efeito no ledger                                          |
 * |-------------------------------|-----------------------------------------------------------|
 * | Solicitação (BR-103)          | INSERT `session_spent` **held** (−D do disponível)         |
 * | Recusa / cancel. 100% (BR-401) | `held → released` (disponível volta integralmente)         |
 * | Cancel. 50% (§5.5)            | `held → posted` + INSERT `refund` (+50% ao aluno)          |
 * | Cancel. 0% / no-show (§5.5)   | `held → posted` (saldo consumido, sem crédito ao instrutor) |
 * | Conclusão bilateral (BR-104)  | `held → posted` + INSERT `session_earned` (+D ao instrutor)  |
 * | Expiração (BR-105/106)        | INSERT `expiry`posted (débito espelho)                      |
 *
 * Toda mutação: `lockUserLedger` → validação → INSERT/UPDATE → `audit_log`, tudo na
 * **mesma transação** (BR-108) e com `balance_after` snapshot (JS-05).
 */
import { and, eq } from 'drizzle-orm';
import { db, type Executor } from '../../db/client.js';
import { WALLET } from '../../config/constants.js';
import { users, type EntryStatus, type EntryType } from '../../db/schema/index.js';
import { addDays } from '../../shared/datetime.js';
import { AppError, insufficientCredits } from '../../shared/errors.js';
import { writeAudit, type RequestContext } from '../../shared/audit.js';
import {
  findExpirableEntries,
  findHoldForBooking,
  findUsersWithExpirableEntries,
  getBalance,
  insertEntry,
  isIdempotencyConflict,
  listEntries,
  lockUserLedger,
  transitionHold,
  type BalanceRow,
} from './wallet.repository.js';

/** Resultado de uma movimentação — inclui o saldo após o lançamento (JS-05). */
export interface LedgerChange {
  entryId: string;
  userId: string;
  type: EntryType;
  minutes: number;
  status: EntryStatus;
  balanceAfter: number;
}

// ─────────────────────────────────────────────────────────────────────────
// BR-101 — bônus de boas-vindas
// ─────────────────────────────────────────────────────────────────────────

/**
 * BR-101 — credita **+120 min uma única vez**, na conclusão do onboarding.
 * Idempotente: o índice único `wallet_entries_welcome_bonus_unique` impede o segundo crédito
 * mesmo sob concorrência (o chamador trata o 23505).
 */
export async function creditWelcomeBonus(
  userId: string,
  ctx: RequestContext = {},
  executor: Executor = db,
  now = new Date(),
): Promise<LedgerChange | null> {
  await lockUserLedger(executor, userId);
  try {
    const balance = await getBalance(executor, userId);
    const row = await insertEntry(executor, {
      userId,
      type: 'welcome_bonus',
      minutes: WALLET.WELCOME_BONUS_MINUTES,
      status: 'posted',
      // BR-105 — créditos de origem externa expiram em 90 dias.
      expiresAt: addDays(now, WALLET.EXPIRY_DAYS),
      balanceAfter: balance.available_minutes + WALLET.WELCOME_BONUS_MINUTES,
      description: 'Bônus de boas-vindas',
      idempotencyKey: 'welcome_bonus',
    });
    await writeAudit(executor, {
      actorId: ctx.actorId ?? null,
      action: 'wallet.welcome_bonus_granted',
      entity: 'wallet_entry',
      entityId: row.id,
      payload: { minutes: WALLET.WELCOME_BONUS_MINUTES, userId },
      ip: ctx.ip,
      correlationId: ctx.correlationId,
    });
    return {
      entryId: row.id,
      userId,
      type: row.type,
      minutes: row.minutes,
      status: row.status,
      balanceAfter: row.balanceAfter,
    };
  } catch (err) {
    if (isIdempotencyConflict(err)) return null; // já creditado
    throw err;
  }
}

/**
 * Endpoint `POST /v1/wallet/welcome-credit` (F4.1): só funciona para usuário com onboarding
 * concluído e **sem** bônus anterior. Na prática é acionado pelo próprio onboarding.
 */
export async function claimWelcomeBonus(userId: string, ctx: RequestContext = {}): Promise<LedgerChange | null> {
  return db.transaction(async (tx) => {
    const [user] = await tx
      .select({ onboardingCompletedAt: users.onboardingCompletedAt })
      .from(users)
      .where(and(eq(users.id, userId), eq(users.status, 'active')))
      .limit(1);
    if (!user) throw new AppError(404, 'NOT_FOUND', 'Usuário não encontrado ou inativo.');
    if (!user.onboardingCompletedAt) {
      throw new AppError(422, 'INVALID_TRANSITION', 'Conclua o onboarding para receber o bônus.');
    }
    return creditWelcomeBonus(userId, ctx, tx);
  });
}

// ─────────────────────────────────────────────────────────────────────────
// BR-103 — reserva (hold)
// ─────────────────────────────────────────────────────────────────────────

/**
 * BR-103/BR-107 — reserva `minutes` do aluno na solicitação da sessão.
 * Falha com `422 INSUFFICIENT_CREDITS` se o disponível for menor que o custo.
 */
export async function holdCredits(
  params: {
    userId: string;
    bookingId: string;
    minutes: number;
    description?: string;
    idempotencyKey?: string;
  },
  ctx: RequestContext = {},
  executor: Executor = db,
): Promise<LedgerChange> {
  const { userId, bookingId, minutes } = params;
  await lockUserLedger(executor, userId);
  const balance = await getBalance(executor, userId);

  // BR-107 — nunca negativo.
  if (balance.available_minutes < minutes) {
    throw insufficientCredits(
      `Saldo insuficiente: disponível ${balance.available_minutes} min, necessário ${minutes} min.`,
    );
  }

  const row = await insertEntry(executor, {
    userId,
    bookingId,
    type: 'session_spent',
    minutes,
    status: 'held',
    balanceAfter: balance.available_minutes - minutes,
    description: params.description ?? 'Reserva de sessão',
    idempotencyKey: params.idempotencyKey ?? `hold:${bookingId}`,
  });

  await writeAudit(executor, {
    actorId: ctx.actorId ?? null,
    action: 'wallet.hold_created',
    entity: 'booking',
    entityId: bookingId,
    payload: { userId, minutes, availableBefore: balance.available_minutes },
    ip: ctx.ip,
    correlationId: ctx.correlationId,
  });

  return {
    entryId: row.id,
    userId,
    type: row.type,
    minutes: row.minutes,
    status: row.status,
    balanceAfter: row.balanceAfter,
  };
}

// ─────────────────────────────────────────────────────────────────────────
// BR-104 / BR-401 — baixa da reserva
// ─────────────────────────────────────────────────────────────────────────

export type HoldReleaseOutcome =
  | { kind: 'released'; holdId: string; balanceAfter: number }
  | {
      kind: 'consumed';
      holdId: string;
      balanceAfter: number;
      refundEntry?: LedgerChange;
      teacherCredit?: LedgerChange;
    };

/**
 * Libera integralmente a reserva (recusa ou cancelamento com reembolso 100%).
 * A transição `held → released` basta para devolver os minutos ao disponível.
 */
export async function releaseHold(
  params: { userId: string; bookingId: string; reason: string },
  ctx: RequestContext = {},
  executor: Executor = db,
): Promise<HoldReleaseOutcome | null> {
  const { userId, bookingId, reason } = params;
  await lockUserLedger(executor, userId);
  const hold = await findHoldForBooking(executor, bookingId, userId);
  if (!hold) return null; // já baixada (idempotência — BR-310)

  const balance = await getBalance(executor, userId);
  const balanceAfter = balance.available_minutes + hold.minutes;
  await transitionHold(executor, hold.id, 'released', balanceAfter);

  await writeAudit(executor, {
    actorId: ctx.actorId ?? null,
    action: 'wallet.hold_released',
    entity: 'booking',
    entityId: bookingId,
    payload: { userId, minutes: hold.minutes, reason },
    ip: ctx.ip,
    correlationId: ctx.correlationId,
  });
  return { kind: 'released', holdId: hold.id, balanceAfter };
}

/**
 * Consome a reserva e devolve `refundMinutes` ao aluno (§5.5 reembolso parcial).
 * Usado em: cancelamento com 50% de reembolso.
 */
export async function consumeHoldWithPartialRefund(
  params: { userId: string; bookingId: string; refundMinutes: number; reason: string },
  ctx: RequestContext = {},
  executor: Executor = db,
): Promise<HoldReleaseOutcome | null> {
  const { userId, bookingId, refundMinutes, reason } = params;
  await lockUserLedger(executor, userId);
  const hold = await findHoldForBooking(executor, bookingId, userId);
  if (!hold) return null;

  let balance = await getBalance(executor, userId);
  // O consumo definitivo do valor integral.
  const consumedBalanceAfter = balance.available_minutes;
  await transitionHold(executor, hold.id, 'posted', consumedBalanceAfter);

  let refundEntry: LedgerChange | undefined;
  if (refundMinutes > 0) {
    balance = await getBalance(executor, userId);
    refundEntry = toChange(
      await insertEntry(executor, {
        userId,
        bookingId,
        type: 'refund',
        minutes: refundMinutes,
        status: 'posted',
        balanceAfter: balance.available_minutes + refundMinutes,
        description: 'Reembolso parcial de cancelamento',
        idempotencyKey: `refund:${bookingId}`,
      }),
    );
  }

  await writeAudit(executor, {
    actorId: ctx.actorId ?? null,
    action: 'wallet.hold_consumed_partial_refund',
    entity: 'booking',
    entityId: bookingId,
    payload: { userId, minutes: hold.minutes, refundMinutes, reason },
    ip: ctx.ip,
    correlationId: ctx.correlationId,
  });

  return {
    kind: 'consumed',
    holdId: hold.id,
    balanceAfter: refundEntry?.balanceAfter ?? consumedBalanceAfter,
    refundEntry,
  };
}

/**
 * Consome a reserva sem reembolso (`< 2 h` ou no-show — §5.5).
 */
export async function consumeHold(
  params: { userId: string; bookingId: string; reason: string },
  ctx: RequestContext = {},
  executor: Executor = db,
): Promise<HoldReleaseOutcome | null> {
  const { userId, bookingId, reason } = params;
  await lockUserLedger(executor, userId);
  const hold = await findHoldForBooking(executor, bookingId, userId);
  if (!hold) return null;

  const balance = await getBalance(executor, userId);
  await transitionHold(executor, hold.id, 'posted', balance.available_minutes);

  await writeAudit(executor, {
    actorId: ctx.actorId ?? null,
    action: 'wallet.hold_consumed',
    entity: 'booking',
    entityId: bookingId,
    payload: { userId, minutes: hold.minutes, reason },
    ip: ctx.ip,
    correlationId: ctx.correlationId,
  });
  return { kind: 'consumed', holdId: hold.id, balanceAfter: balance.available_minutes };
}

/**
 * BR-104 — conclusão bilateral: consome a reserva do aluno e credita o instrutor
 * exatamente `session_minutes` (BR-102 — sem markup).
 *
 * Idempotente (BR-310): se não houver `hold` ativa, nada é movimentado.
 */
export async function settleBooking(
  params: {
    studentId: string;
    teacherId: string;
    bookingId: string;
    minutes: number;
    categoryName?: string;
  },
  ctx: RequestContext = {},
  executor: Executor = db,
): Promise<{ student: LedgerChange | null; teacher: LedgerChange | null }> {
  const { studentId, teacherId, bookingId, minutes, categoryName } = params;

  // Ordem determinística dos locks (evita deadlock entre dois participantes simultâneos).
  const [first, second] = studentId < teacherId ? [studentId, teacherId] : [teacherId, studentId];
  await lockUserLedger(executor, first);
  if (second !== first) await lockUserLedger(executor, second);

  const consumed = await consumeHold(
    { userId: studentId, bookingId, reason: 'conclusao_bilateral' },
    ctx,
    executor,
  );
  if (!consumed) {
    // BR-310 — já liquidado; não duplica crédito.
    return { student: null, teacher: null };
  }

  const teacherBalance = await getBalance(executor, teacherId);
  const teacherRow = await insertEntry(executor, {
    userId: teacherId,
    bookingId,
    type: 'session_earned',
    minutes, // BR-102 — 1 min de aula = 1 min de crédito
    status: 'posted',
    // BR-105 — tempo ensinado também expira em 90 dias (política uniforme de créditos).
    expiresAt: addDays(new Date(), WALLET.EXPIRY_DAYS),
    balanceAfter: teacherBalance.available_minutes + minutes,
    description: categoryName ? `Sessão concluída — ${categoryName}` : 'Sessão concluída',
    idempotencyKey: `earn:${bookingId}`,
  });

  await writeAudit(executor, {
    actorId: ctx.actorId ?? null,
    action: 'wallet.session_settled',
    entity: 'booking',
    entityId: bookingId,
    payload: { studentId, teacherId, minutes },
    ip: ctx.ip,
    correlationId: ctx.correlationId,
  });

  return {
    student: {
      entryId: consumed.holdId,
      userId: studentId,
      type: 'session_spent',
      minutes,
      status: 'posted',
      balanceAfter: consumed.balanceAfter,
    },
    teacher: toChange(teacherRow),
  };
}

/**
 * Crédito de composição ao instrutor quando o aluno cancela na faixa de 2 h–12 h
 * (50% retido — §5.5).
 */
export async function creditCompositionPenalty(
  params: { teacherId: string; bookingId: string; minutes: number; reason: string },
  ctx: RequestContext = {},
  executor: Executor = db,
): Promise<LedgerChange | null> {
  const { teacherId, bookingId, minutes, reason } = params;
  if (minutes <= 0) return null;
  await lockUserLedger(executor, teacherId);
  const balance = await getBalance(executor, teacherId);
  try {
    const row = await insertEntry(executor, {
      userId: teacherId,
      bookingId,
      type: 'penalty',
      minutes,
      status: 'posted',
      expiresAt: addDays(new Date(), WALLET.EXPIRY_DAYS),
      balanceAfter: balance.available_minutes + minutes,
      description: 'Crédito de composição (cancelamento na faixa de 2h–12h)',
      idempotencyKey: `penalty:${bookingId}`,
    });
    await writeAudit(executor, {
      actorId: ctx.actorId ?? null,
      action: 'wallet.composition_credit',
      entity: 'booking',
      entityId: bookingId,
      payload: { teacherId, minutes, reason },
      ip: ctx.ip,
      correlationId: ctx.correlationId,
    });
    return toChange(row);
  } catch (err) {
    if (isIdempotencyConflict(err)) return null;
    throw err;
  }
}

// ─────────────────────────────────────────────────────────────────────────
// Leitura
// ─────────────────────────────────────────────────────────────────────────

/** F4.2 — saldo atual do usuário autenticado. */
export async function getWalletSummary(userId: string): Promise<BalanceRow> {
  return getBalance(db, userId);
}

/** F4.6 — extrato paginado (cursor). */
export async function getStatement(
  userId: string,
  opts: { limit: number; cursor?: { createdAt: string; id: string } | null; type?: EntryType },
) {
  return listEntries(db, userId, opts);
}

// ─────────────────────────────────────────────────────────────────────────
// BR-105 / BR-106 — job de expiração (FIFO)
// ─────────────────────────────────────────────────────────────────────────

/**
 * Job diário `POST /v1/internal/jobs/expire-credits`.
 *
 * Para cada crédito `posted` já vencido, insere um lançamento espelho `expiry` (débito).
 * Consumo FIFO é consequência natural doBR-105 + `expires_at` por lote de crédito:
 * o lançamento mais antigo é sempre o primeiro a vencer.
 */
export async function expireDueCredits(now = new Date()): Promise<{ expired: number; minutes: number }> {
  const candidates = await findUsersWithExpirableEntries(db, now, 500);
  let expired = 0;
  let minutes = 0;

  for (const { userId } of candidates) {
    const result = await db.transaction(async (tx) => {
      await lockUserLedger(tx, userId);
      const due = await findExpirableEntries(tx, now, 200);
      if (due.length === 0) return { expired: 0, minutes: 0 };

      let available = (await getBalance(tx, userId)).available_minutes;
      let totalMinutes = 0;
      for (const entry of due) {
        // Nunca expira mais do que o disponível:BR-107 (saldo nunca negativo).
        const minutesToExpire = Math.min(entry.minutes, Math.max(available, 0));
        if (minutesToExpire <= 0) continue;
        available -= minutesToExpire;
        await insertEntry(tx, {
          userId,
          bookingId: entry.bookingId,
          type: 'expiry',
          minutes: minutesToExpire,
          status: 'posted',
          balanceAfter: available,
          description: 'Expiração de crédito (90 dias)',
          idempotencyKey: `expiry:${entry.id}`,
        });
        await writeAudit(tx, {
          action: 'wallet.credit_expired',
          entity: 'wallet_entry',
          entityId: entry.id,
          payload: { userId, minutes: minutesToExpire, expiresAt: entry.expiresAt?.toISOString() ?? null },
        });
        totalMinutes += minutesToExpire;
      }
      return { expired: due.length, minutes: totalMinutes };
    });
    expired += result.expired;
    minutes += result.minutes;
  }

  return { expired, minutes };
}

function toChange(row: {
  id: string;
  userId: string;
  type: EntryType;
  minutes: number;
  status: 'held' | 'posted' | 'released' | 'expired' | 'reversed';
  balanceAfter: number;
}): LedgerChange {
  return {
    entryId: row.id,
    userId: row.userId,
    type: row.type,
    minutes: row.minutes,
    status: row.status as LedgerChange['status'],
    balanceAfter: row.balanceAfter,
  };
}