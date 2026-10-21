/**
 * Repositório de agendamentos (Dev 3).
 *
 * Responsabilidades de dados (regras no `booking.service.ts`):
 *  - leitura/escrita de `bookings` com lock pessimista na transição de estado
 *    (`SELECT ... FOR UPDATE`), evitando double-accept entre duas requisições;
 *  - detecção de sobreposição para a mensagem de erro amigável (BR-306) — a garantia
 *    final é a constraint `EXCLUDE USING gist` criada em migração customizada;
 *  - agenda do instrutor (`GET /users/:id/slots`), combinando `availability_slots`
 *    com os intervalos já reservados;
 *  - contadores de reputação (`late_cancellation_count`, `no_show_count`) de BR-403/404.
 */
import { and, asc, desc, eq, gt, gte, inArray, lt, ne, or, sql, type SQL } from 'drizzle-orm';

import { db, type Executor } from '../../db/client.js';
import {
  availabilitySlots,
  bookings,
  categories,
  userSkills,
  users,
  type Booking,
  type BookingStatus,
  type NewBooking,
} from '../../db/schema/index.js';
import { BLOCKING_BOOKING_STATUSES } from '../../config/constants.js';

// ─────────────────────────────────────────────────────────────────────────
// Bookings — leitura
// ─────────────────────────────────────────────────────────────────────────

/** Colunas do agendamento enrichidas com a categoria (respostas do app). */
export const bookingWithCategoryColumns = {
  id: bookings.id,
  teacherId: bookings.teacherId,
  studentId: bookings.studentId,
  categoryId: bookings.categoryId,
  categoryName: categories.name,
  categorySlug: categories.slug,
  scheduledAt: bookings.scheduledAt,
  durationMinutes: bookings.durationMinutes,
  creditsAmount: bookings.creditsAmount,
  status: bookings.status,
  studentMessage: bookings.studentMessage,
  declineReason: bookings.declineReason,
  meetingType: bookings.meetingType,
  meetingLocation: bookings.meetingLocation,
  cancelledBy: bookings.cancelledBy,
  cancellationReason: bookings.cancellationReason,
  cancelledAt: bookings.cancelledAt,
  studentCompletedAt: bookings.studentCompletedAt,
  completedAt: bookings.completedAt,
  expiresAt: bookings.expiresAt,
  createdAt: bookings.createdAt,
  updatedAt: bookings.updatedAt,
} as const;

const selectWithCategory = () =>
  db
    .select(bookingWithCategoryColumns)
    .from(bookings)
    .innerJoin(categories, eq(categories.id, bookings.categoryId));

/** Agendamento por id — `null` quando não existe. */
export async function findBookingById(bookingId: string): Promise<Booking | undefined> {
  const [row] = await db.select().from(bookings).where(eq(bookings.id, bookingId)).limit(1);
  return row;
}

/** Agendamento com o nome da categoria (para as respostas). */
export async function findBookingView(bookingId: string) {
  const [row] = await selectWithCategory().where(eq(bookings.id, bookingId)).limit(1);
  return row;
}

/**
 * Lock pessimista do agendamento — primeira operação de **qualquer** transição de estado.
 * Sem ele, dois `accept` simultâneos poderiam ambos ler `pending`.
 */
export async function lockBooking(executor: Executor, bookingId: string): Promise<void> {
  await executor.execute(sql`SELECT id FROM bookings WHERE id = ${bookingId} FOR UPDATE`);
}

/**
 * BR-306 — sessões do instrutor que **bloqueiam** a agenda (`confirmed` /
 * `awaiting_confirmation`) dentro de uma janela.
 *
 * O intervalo é calculado no SQL com `tstzrange`, a mesma expressão usada pela
 * constraint `EXCLUDE USING gist`, então o preview e a garantia final não divergem.
 */
export async function findBlockingBookings(
  teacherId: string,
  windowStart: Date,
  windowEnd: Date,
  executor: Executor = db,
  excludeBookingId?: string,
): Promise<{ id: string; scheduledAt: Date; durationMinutes: number }[]> {
  const conditions: SQL[] = [
    eq(bookings.teacherId, teacherId),
    inArray(bookings.status, [...BLOCKING_BOOKING_STATUSES]),
    sql`tstzrange(${bookings.scheduledAt}, ${bookings.scheduledAt} + (${bookings.durationMinutes} || ' minutes')::interval)
        && tstzrange(${windowStart}, ${windowEnd})`,
  ];
  if (excludeBookingId) conditions.push(ne(bookings.id, excludeBookingId));
  return executor
    .select({ id: bookings.id, scheduledAt: bookings.scheduledAt, durationMinutes: bookings.durationMinutes })
    .from(bookings)
    .where(and(...conditions))
    .orderBy(asc(bookings.scheduledAt));
}

/** Todas as sessões do usuário como aluno ou instrutor — paginação por cursor (NF-P06). */
export async function listUserBookings(
  userId: string,
  opts: {
    role?: 'student' | 'teacher' | 'all';
    statuses?: BookingStatus[];
    from?: Date;
    to?: Date;
    limit: number;
    cursor?: { createdAt: string; id: string } | null;
  },
) {
  const filters: SQL[] = [];
  if (opts.role === 'student') filters.push(eq(bookings.studentId, userId));
  else if (opts.role === 'teacher') filters.push(eq(bookings.teacherId, userId));
  else filters.push(or(eq(bookings.studentId, userId), eq(bookings.teacherId, userId))!);

  if (opts.statuses?.length) filters.push(inArray(bookings.status, opts.statuses));
  if (opts.from) filters.push(gte(bookings.scheduledAt, opts.from));
  if (opts.to) filters.push(lt(bookings.scheduledAt, opts.to));
  if (opts.cursor) {
    const cursorDate = new Date(opts.cursor.createdAt);
    filters.push(
      sql`(${bookings.createdAt}, ${bookings.id}) < (${cursorDate}, ${opts.cursor.id}::uuid)`,
    );
  }

  return db
    .select(bookingWithCategoryColumns)
    .from(bookings)
    .innerJoin(categories, eq(categories.id, bookings.categoryId))
    .where(and(...filters))
    .orderBy(desc(bookings.createdAt), desc(bookings.id))
    .limit(opts.limit + 1);
}

/** Próximas sessões (F3.9 — `GET /me/upcoming`). */
export async function listUpcomingBookings(userId: string, now = new Date(), limit = 20) {
  return db
    .select(bookingWithCategoryColumns)
    .from(bookings)
    .innerJoin(categories, eq(categories.id, bookings.categoryId))
    .where(
      and(
        or(eq(bookings.studentId, userId), eq(bookings.teacherId, userId)),
        inArray(bookings.status, [...BLOCKING_BOOKING_STATUSES]),
        gte(bookings.scheduledAt, now),
      ),
    )
    .orderBy(asc(bookings.scheduledAt))
    .limit(limit);
}

// ─────────────────────────────────────────────────────────────────────────
// Bookings — escrita
// ─────────────────────────────────────────────────────────────────────────

export async function insertBooking(
  values: NewBooking,
  executor: Executor = db,
): Promise<Booking> {
  const [row] = await executor.insert(bookings).values(values).returning();
  return row;
}

/** Transição de estado — sempre precedida por `lockBooking` na mesma transação. */
export async function updateBookingState(
  bookingId: string,
  patch: Partial<NewBooking>,
  expectedStatus?: BookingStatus | BookingStatus[],
  executor: Executor = db,
): Promise<Booking | undefined> {
  const conditions: SQL[] = [eq(bookings.id, bookingId)];
  if (expectedStatus) {
    conditions.push(
      Array.isArray(expectedStatus)
        ? inArray(bookings.status, expectedStatus)
        : eq(bookings.status, expectedStatus),
    );
  }
  const [row] = await executor
    .update(bookings)
    .set({ ...patch, updatedAt: new Date() })
    .where(and(...conditions))
    .returning();
  return row;
}

/** `EXCLUDE USING gist` (23P01) — sobreposição de agenda do instrutor (BR-306). */
export function isOverlapViolation(err: unknown): boolean {
  const code = (err as { code?: string }).code;
  const constraint = (err as { constraint?: string }).constraint;
  return code === '23P01' && constraint === 'bookings_teacher_no_overlap';
}

/** Traduz a violação de agenda em `409 SLOT_UNAVAILABLE` (PRD §8.3). */
export function slotUnavailableError() {
  return {
    statusCode: 409,
    code: 'SLOT_UNAVAILABLE' as const,
    message: 'Este horário já está reservado. Escolha outro.',
  };
}

// ─────────────────────────────────────────────────────────────────────────
// Habilidades e disponibilidade do instrutor
// ─────────────────────────────────────────────────────────────────────────

/** BR-305 / BR-201 — o instrutor precisa ensinar a categoria da sessão. */
export async function teacherTeachesCategory(
  teacherId: string,
  categoryId: string,
  executor: Executor = db,
): Promise<boolean> {
  const rows = await executor
    .select({ id: userSkills.id })
    .from(userSkills)
    .where(
      and(
        eq(userSkills.userId, teacherId),
        eq(userSkills.categoryId, categoryId),
        eq(userSkills.mode, 'teach'),
      ),
    )
    .limit(1);
  return rows.length > 0;
}

/** Janelas ativas do instrutor para um dia da semana (BR-305). */
export async function findAvailabilityWindows(
  teacherId: string,
  weekday: number,
  executor: Executor = db,
) {
  return executor
    .select({
      startTime: availabilitySlots.startTime,
      endTime: availabilitySlots.endTime,
    })
    .from(availabilitySlots)
    .where(
      and(
        eq(availabilitySlots.userId, teacherId),
        eq(availabilitySlots.weekday, weekday),
        eq(availabilitySlots.active, true),
      ),
    )
    .orderBy(asc(availabilitySlots.startTime));
}

/** Todas as janelas ativas do instrutor — usado para montar a agenda do slot picker. */
export async function findAllAvailabilityWindows(teacherId: string) {
  return db
    .select({
      weekday: availabilitySlots.weekday,
      startTime: availabilitySlots.startTime,
      endTime: availabilitySlots.endTime,
    })
    .from(availabilitySlots)
    .where(and(eq(availabilitySlots.userId, teacherId), eq(availabilitySlots.active, true)))
    .orderBy(asc(availabilitySlots.weekday), asc(availabilitySlots.startTime));
}

// ─────────────────────────────────────────────────────────────────────────
// Jobs (BR-304, BR-309, BR-308)
// ─────────────────────────────────────────────────────────────────────────

/** BR-304 — solicitações `pending` cujo prazo de 48 h já passou. */
export async function findExpiredPendings(now = new Date(), limit = 200) {
  return db
    .select({ id: bookings.id, studentId: bookings.studentId, teacherId: bookings.teacherId, expiresAt: bookings.expiresAt })
    .from(bookings)
    .where(
      and(
        eq(bookings.status, 'pending'),
        sql`${bookings.expiresAt} IS NOT NULL`,
        lt(bookings.expiresAt, now),
      ),
    )
    .limit(limit);
}

/** BR-309 — sessões em `awaiting_confirmation` cujo prazo de 24 h passou. */
export async function findAwaitingConfirmationOverdue(now = new Date(), limit = 200) {
  return db
    .select({ id: bookings.id, studentId: bookings.studentId, teacherId: bookings.teacherId, studentCompletedAt: bookings.studentCompletedAt })
    .from(bookings)
    .where(
      and(
        eq(bookings.status, 'awaiting_confirmation'),
        sql`${bookings.studentCompletedAt} IS NOT NULL`,
        lt(bookings.studentCompletedAt, new Date(now.getTime() - 24 * 3_600_000)),
      ),
    )
    .limit(limit);
}

/**
 * BR-308 — sessões `confirmed` cujo horário + tolerância de 30 min já passou sem
 * `student_completed_at`: o aluno não compareceu.
 */
export async function findLikelyNoShows(now = new Date(), limit = 200) {
  return db
    .select({
      id: bookings.id,
      studentId: bookings.studentId,
      teacherId: bookings.teacherId,
      scheduledAt: bookings.scheduledAt,
      durationMinutes: bookings.durationMinutes,
    })
    .from(bookings)
    .where(
      and(
        eq(bookings.status, 'confirmed'),
        sql`${bookings.studentCompletedAt} IS NULL`,
        lt(
          sql`${bookings.scheduledAt} + (${bookings.durationMinutes} || ' minutes')::interval`,
          new Date(now.getTime() - 30 * 60_000),
        ),
      ),
    )
    .limit(limit);
}

// ─────────────────────────────────────────────────────────────────────────
// Reputação (BR-403 / BR-404) e caches derivados (§7.4)
// ─────────────────────────────────────────────────────────────────────────

/** BR-403 — contador de cancelamentos tardios (< 12 h) na janela de 90 dias. */
export async function incrementLateCancellation(
  userId: string,
  executor: Executor = db,
): Promise<{ count: number; suspended: boolean }> {
  const [row] = await executor
    .update(users)
    .set({ lateCancellationCount: sql`${users.lateCancellationCount} + 1` })
    .where(eq(users.id, userId))
    .returning({ count: users.lateCancellationCount });

  const count = row?.count ?? 0;
  if (count >= 3) {
    // 3 cancelamentos tardios → suspensão de 14 dias para solicitar novas sessões.
    await executor
      .update(users)
      .set({
        status: 'suspended',
        suspendedUntil: new Date(Date.now() + 14 * 86_400_000),
        updatedAt: new Date(),
      })
      .where(eq(users.id, userId));
    return { count, suspended: true };
  }
  return { count, suspended: false };
}

/** BR-404 — contador de no-show; 2 bloqueiam permanentemente o agendamento. */
export async function incrementNoShow(
  userId: string,
  executor: Executor = db,
): Promise<{ count: number; blocked: boolean }> {
  const [row] = await executor
    .update(users)
    .set({ noShowCount: sql`${users.noShowCount} + 1` })
    .where(eq(users.id, userId))
    .returning({ count: users.noShowCount });

  const count = row?.count ?? 0;
  return { count, blocked: count >= 2 };
}

/** §7.4 — cache `sessions_as_teacher`, recalculado a partir dos agendamentos concluídos. */
export async function refreshSessionsAsTeacher(userId: string, executor: Executor = db): Promise<void> {
  await executor.execute(sql`
    UPDATE users
       SET sessions_as_teacher = (
             SELECT count(*)::int FROM bookings
             WHERE teacher_id = ${userId} AND status = 'completed'
           ),
           updated_at = now()
     WHERE id = ${userId}`);
}

/** §7.4 / BR-506 — cache `rating_avg` (média ponderada por recência) após nova review. */
export async function refreshRatingAverage(revieweeId: string, executor: Executor = db): Promise<void> {
  await executor.execute(sql`
    UPDATE users
       SET rating_avg = COALESCE((
             SELECT ROUND(SUM(r.rating * (1.0 / (1.0 + (
                      EXTRACT(EPOCH FROM (now() - r.created_at)) / 86400.0 / 30.0
                    ) / 6.0)))::numeric, 2)
             FROM reviews r
             WHERE r.reviewee_id = ${revieweeId}
           ), NULL),
           updated_at = now()
     WHERE id = ${revieweeId}`);
}

/**_BR-704_ — sinalizações de review nas últimas 24 h (limiar de moderação). */
export async function countRecentReviewFlags(
  userId: string,
  windowHours = 24,
  executor: Executor = db,
): Promise<number> {
  const rows = await executor.execute(sql`
    SELECT count(*)::int AS total
      FROM reports
     WHERE target_user_id = ${userId}
       AND review_id IS NOT NULL
       AND created_at > now() - (${windowHours} || ' hours')::interval`);
  const list = rows as unknown as { total: number }[];
  return Number(list[0]?.total ?? 0);
}

/** Contagem de sessões concluídas como instrutor (para o card público). */
export async function countCompletedSessions(
  teacherId: string,
  executor: Executor = db,
): Promise<number> {
  const rows = await executor
    .select({ count: sql<number>`count(*)::int` })
    .from(bookings)
    .where(and(eq(bookings.teacherId, teacherId), eq(bookings.status, 'completed')));
  return Number(rows[0]?.count ?? 0);
}

/** Agenda do instrutor para uma janela — base do cálculo de slots livres (F3.1). */
export async function findBusyIntervals(
  teacherId: string,
  from: Date,
  to: Date,
  executor: Executor = db,
) {
  return executor
    .select({
      scheduledAt: bookings.scheduledAt,
      durationMinutes: bookings.durationMinutes,
    })
    .from(bookings)
    .where(
      and(
        eq(bookings.teacherId, teacherId),
        inArray(bookings.status, [...BLOCKING_BOOKING_STATUSES]),
        gt(bookings.scheduledAt, new Date(from.getTime() - 6 * 3_600_000)),
        lt(bookings.scheduledAt, new Date(to.getTime() + 6 * 3_600_000)),
      ),
    )
    .orderBy(asc(bookings.scheduledAt));
}

/** Usuário para as validações de actor (sem PII além do necessário). */
export async function findSchedulingUser(
  userId: string,
  executor: Executor = db,
): Promise<
  | {
      id: string;
      status: 'active' | 'suspended' | 'deleted';
      onboardingCompletedAt: Date | null;
      suspendedUntil: Date | null;
      noShowCount: number;
      lateCancellationCount: number;
      timezone: string;
    }
  | undefined
> {
  const [row] = await executor
    .select({
      id: users.id,
      status: users.status,
      onboardingCompletedAt: users.onboardingCompletedAt,
      suspendedUntil: users.suspendedUntil,
      noShowCount: users.noShowCount,
      lateCancellationCount: users.lateCancellationCount,
      timezone: users.timezone,
    })
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);
  return row;
}