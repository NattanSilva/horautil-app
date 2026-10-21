/**
 * `bookings` — PRD §7.2.
 *
 * Máquina de estados (§3.2):
 *   pending → accepted → confirmed → awaiting_confirmation → completed
 *   pending → declined | expira em 48 h → declined (BR-304)
 *   confirmed → cancelled_student | cancelled_teacher (BR-401..406)
 *   confirmed → no_show
 *
 * Integridade de agenda (BR-306 / ADR-002): a exclusão de sobreposição é garantida pelo
 * Postgres com `EXCLUDE USING gist (teacher_id WITH =, tstzrange(...) WITH &&)`
 * para os status `confirmed` e `awaiting_confirmation`. A constraint é criada por migração
 * customizada (o Drizzle não expressa `EXCLUDE`), vide README → "Migrações".
 */
import { sql } from 'drizzle-orm';
import {
  check,
  index,
  pgTable,
  smallint,
  text,
  timestamp,
  uuid,
  varchar,
} from 'drizzle-orm/pg-core';

import { categories } from './categories.js';
import { bookingStatus, meetingType } from './enums.js';
import { users } from './users.js';

export const bookings = pgTable(
  'bookings',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    teacherId: uuid('teacher_id')
      .notNull()
      .references(() => users.id),
    studentId: uuid('student_id')
      .notNull()
      .references(() => users.id),
    /** Habilidade ensinada na sessão — validada contra `user_skills(mode='teach')`. */
    categoryId: uuid('category_id')
      .notNull()
      .references(() => categories.id),
    /** Início da sessão em UTC (BR: sempre_instante absoluto). */
    scheduledAt: timestamp('scheduled_at', { withTimezone: true }).notNull(),
    /** BR-301 — múltiplo de 30, entre 30 e 180. */
    durationMinutes: smallint('duration_minutes').notNull(),
    /** BR-102 — 1 h de aula = 1 crédito; sem markup. */
    creditsAmount: smallint('credits_amount').notNull(),
    status: bookingStatus('status').notNull().default('pending'),
    /** Contexto enviado pelo aluno na solicitação. */
    studentMessage: text('student_message'),
    declineReason: text('decline_reason'),
    meetingType: meetingType('meeting_type').notNull().default('external'),
    /** Link ou endereço — visível **apenas** entre as duas partes. */
    meetingLocation: varchar('meeting_location', { length: 200 }),
    cancelledBy: uuid('cancelled_by').references(() => users.id),
    cancellationReason: text('cancellation_reason'),
    cancelledAt: timestamp('cancelled_at', { withTimezone: true }),
    /** BR-308 — check-in / conclusão sinalizada pelo aluno. */
    studentCompletedAt: timestamp('student_completed_at', { withTimezone: true }),
    /** Conclusão bilateral (BR-104 / BR-309). */
    completedAt: timestamp('completed_at', { withTimezone: true }),
    /** Fim da janela de aceite de 48 h (BR-304). */
    expiresAt: timestamp('expires_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index('idx_bookings_teacher_time').on(t.teacherId, t.scheduledAt),
    index('idx_bookings_student_time').on(t.studentId, t.scheduledAt),
    index('idx_bookings_status_created').on(t.status, t.createdAt),
    // Job de expiração de `pending` (BR-304): busca parcial por status + prazo
    index('idx_bookings_pending_expiry')
      .on(t.expiresAt)
      .where(sql`${t.status} = 'pending'`),
    // Job de auto-confirmar conclusão (BR-309)
    index('idx_bookings_awaiting_confirmation')
      .on(t.studentCompletedAt)
      .where(sql`${t.status} = 'awaiting_confirmation'`),
    check('bookings_distinct_participants', sql`${t.teacherId} <> ${t.studentId}`),
    check(
      'bookings_duration_valid',
      sql`${t.durationMinutes} >= 30 AND ${t.durationMinutes} <= 180 AND ${t.durationMinutes} % 30 = 0`,
    ),
  ],
);

export type Booking = typeof bookings.$inferSelect;
export type NewBooking = typeof bookings.$inferInsert;

/** Colunas expostas ao cliente (nunca `declineReason` interno etc.). */
export const bookingPublicColumns = {
  id: bookings.id,
  teacherId: bookings.teacherId,
  studentId: bookings.studentId,
  categoryId: bookings.categoryId,
  scheduledAt: bookings.scheduledAt,
  durationMinutes: bookings.durationMinutes,
  creditsAmount: bookings.creditsAmount,
  status: bookings.status,
  studentMessage: bookings.studentMessage,
  meetingType: bookings.meetingType,
  meetingLocation: bookings.meetingLocation,
  cancelledBy: bookings.cancelledBy,
  cancellationReason: bookings.cancellationReason,
  cancelledAt: bookings.cancelledAt,
  studentCompletedAt: bookings.studentCompletedAt,
  completedAt: bookings.completedAt,
  expiresAt: bookings.expiresAt,
  createdAt: bookings.createdAt,
} as const;