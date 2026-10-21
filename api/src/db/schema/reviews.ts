/**
 * `reviews` — PRD §7.2.
 *
 * BR-501 elegibilidade · BR-502 unicidade por sessão (UNIQUE em `booking_id`) ·
 * BR-504 rating 1–5 e comentário 10–500 chars · BR-507 nome do autor exibido parcialmente.
 */
import { sql } from 'drizzle-orm';
import {
  check,
  index,
  pgTable,
  smallint,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from 'drizzle-orm/pg-core';

import { bookings } from './bookings.js';
import { users } from './users.js';

export const reviews = pgTable(
  'reviews',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    /** BR-502 — UNIQUE: no máximo 1 review por sessão. */
    bookingId: uuid('booking_id')
      .notNull()
      .references(() => bookings.id),
    /** Autor da avaliação (o aluno). */
    reviewerId: uuid('reviewer_id')
      .notNull()
      .references(() => users.id),
    /** Avaliado (o instrutor). */
    revieweeId: uuid('reviewee_id')
      .notNull()
      .references(() => users.id),
    rating: smallint('rating').notNull(),
    comment: text('comment').notNull(),
    /** F5.5 — resposta pública do instrutor (1 por review). */
    replyText: text('reply_text'),
    repliedAt: timestamp('replied_at', { withTimezone: true }),
    /** BR-505 — review editável em até 24 h. */
    editedAt: timestamp('edited_at', { withTimezone: true }),
    /** BR-704 — sinalizações somadas em 24 h (entra em revisão manual). */
    reportCount: smallint('report_count').notNull().default(0),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    uniqueIndex('reviews_booking_unique').on(t.bookingId),
    index('idx_reviews_reviewee').on(t.revieweeId, sql`${t.createdAt} DESC`),
    index('idx_reviews_rating').on(t.revieweeId, t.rating),
    check('reviews_rating_range', sql`${t.rating} BETWEEN 1 AND 5`),
    check('reviews_comment_length', sql`char_length(${t.comment}) BETWEEN 10 AND 500`),
    check('reviews_not_self_review', sql`${t.reviewerId} <> ${t.revieweeId}`),
  ],
);

export type Review = typeof reviews.$inferSelect;
export type NewReview = typeof reviews.$inferInsert;