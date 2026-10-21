/**
 * `users` — PRD §7.2.
 *
 * Observações de contrato (Dev 1 é o owner deste schema):
 *  - o saldo **nunca** mora aqui: é derivado do ledger `wallet_entries` (ADR-001);
 *  - `rating_avg` e `sessions_as_teacher` são caches **derivados e recriáveis** (§7.4),
 *    recalculados pelo job de agregação de reviews;
 *  - `email` nunca é exposto em respostas públicas (BR-702).
 */
import { sql } from 'drizzle-orm';
import {
  index,
  integer,
  numeric,
  pgTable,
  smallint,
  timestamp,
  uniqueIndex,
  uuid,
  varchar,
  text,
} from 'drizzle-orm/pg-core';

import { userStatus } from './enums.js';

export const users = pgTable(
  'users',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    /** BR-001 — unicidade case-insensitive (índice funcional com `lower()`). */
    email: varchar('email', { length: 255 }).notNull(),
    /** NF-S02 — hash argon2id; nunca texto plano. */
    passwordHash: varchar('password_hash', { length: 255 }).notNull(),
    /** BR-005 — fora do escopo do MVP; login é por e-mail. */
    username: varchar('username', { length: 60 }),
    name: varchar('name', { length: 120 }).notNull(),
    avatarUrl: varchar('avatar_url', { length: 500 }),
    bio: text('bio'),
    city: varchar('city', { length: 120 }),
    timezone: varchar('timezone', { length: 60 }).notNull().default('America/Sao_Paulo'),
    /** BR-003 — preenchido apenas ao concluir os 4 passos do onboarding. */
    onboardingCompletedAt: timestamp('onboarding_completed_at', { withTimezone: true }),
    status: userStatus('status').notNull().default('active'),
    /** BR-403 — fim da suspensão temporária por cancelamentos tardios. */
    suspendedUntil: timestamp('suspended_until', { withTimezone: true }),
    /** BR-403 — cancelamentos tardios (< 12 h) na janela de 90 dias. */
    lateCancellationCount: smallint('late_cancellation_count').notNull().default(0),
    /** BR-404 — contador de no-show. */
    noShowCount: smallint('no_show_count').notNull().default(0),
    /** BR-704 — contagem de avaliações suspeitas em 24 h (moderação). */
    flaggedReviewCount: smallint('flagged_review_count').notNull().default(0),
    /** NF-S12 — consentimento explícito no onboarding (LGPD). */
    marketingConsentAt: timestamp('marketing_consent_at', { withTimezone: true }),
    /** Cache denormalizado — §7.4. Fonte da verdade: `reviews`. */
    ratingAvg: numeric('rating_avg', { precision: 3, scale: 2 }),
    /** Cache denormalizado — §7.4. Fonte da verdade: `bookings`. */
    sessionsAsTeacher: integer('sessions_as_teacher').notNull().default(0),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
    /** BR-007 — soft delete; PII é anonimizada após 30 dias. */
    deletedAt: timestamp('deleted_at', { withTimezone: true }),
    /** Timestamp da última atividade (usado pelo peso `activityRecency`). */
    lastActivityAt: timestamp('last_activity_at', { withTimezone: true }),
  },
  (t) => [
    uniqueIndex('idx_users_email').on(sql`lower(${t.email})`),
    uniqueIndex('idx_users_username').on(sql`lower(${t.username})`),
    index('idx_users_city').on(t.city),
    index('idx_users_rating').on(sql`${t.ratingAvg} DESC NULLS LAST`),
    // BR-004 / F2.2 — usuários "descobertos" precisam de onboarding concluído e status ativo
    index('idx_users_discoverable').on(t.status, sql`${t.onboardingCompletedAt} IS NOT NULL`),
    index('idx_users_deleted_at').on(t.deletedAt),
  ],
);

export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;