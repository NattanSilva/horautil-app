/**
 * `availability_slots` — PRD §7.2 (F1.9).
 *
 * Grade semanal recorrente expressa em **horário local do usuário** (o fuso vive em
 * `users.timezone`). Inícios e términos são múltiplos de 30 min (granularidade do calendário)
 * — garantido por CHECK no banco.
 */
import { sql } from 'drizzle-orm';
import { boolean, check, index, pgTable, smallint, time, uuid } from 'drizzle-orm/pg-core';

import { users } from './users.js';

export const availabilitySlots = pgTable(
  'availability_slots',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    /** 0 = domingo … 6 = sábado (0-indexado como em `Date#getDay`). */
    weekday: smallint('weekday').notNull(),
    startTime: time('start_time', { withTimezone: false }).notNull(),
    endTime: time('end_time', { withTimezone: false }).notNull(),
    /** Permite desativar sem apagar histórico. */
    active: boolean('active').notNull().default(true),
  },
  (t) => [
    index('idx_availability_user_weekday').on(t.userId, t.weekday),
    index('idx_availability_user_active').on(t.userId, t.active),
    check('availability_weekday_range', sql`${t.weekday} BETWEEN 0 AND 6`),
    check('availability_time_order', sql`${t.endTime} > ${t.startTime}`),
    check(
      'availability_30min_alignment',
      sql`EXTRACT(MINUTE FROM ${t.startTime}) % 30 = 0 AND EXTRACT(MINUTE FROM ${t.endTime}) % 30 = 0`,
    ),
  ],
);

export type AvailabilitySlot = typeof availabilitySlots.$inferSelect;
export type NewAvailabilitySlot = typeof availabilitySlots.$inferInsert;