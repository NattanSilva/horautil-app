/**
 * Tabelas de apoio — PRD §7.2 ("Tabelas de Apoio").
 *
 *  - `refresh_tokens`  : sessões ativas (NF-S01 — token opaco 128 bits, hash SHA-256 + pepper, rotação)
 *  - `password_reset_tokens` : NF-S11 — 30 min, uso único, armazenado hasheado
 *  - `notifications`   : feed de notificações (F3.9 — lembretes 24 h / 2 h)
 *  - `user_blocks`     : BR-706 — bloqueio bilateral
 *  - `reports`         : F2.7 / F5.6 — denúncias
 *  - `audit_log`       : BR-705 — trilha de auditoria do ledger e ações sensíveis
 */
import { sql } from 'drizzle-orm';
import {
  check,
  index,
  jsonb,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
  varchar,
} from 'drizzle-orm/pg-core';

import { bookings } from './bookings.js';
import { notificationType, reportStatus } from './enums.js';
import { reviews } from './reviews.js';
import { users } from './users.js';

export const refreshTokens = pgTable(
  'refresh_tokens',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    /** SHA-256 + pepper do token opaco. O token em claro **nunca** é persistido. */
    tokenHash: varchar('token_hash', { length: 64 }).notNull(),
    /** Jade de rotação: quando este token é revogado, a família inteira cai. */
    familyId: uuid('family_id'),
    expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
    revokedAt: timestamp('revoked_at', { withTimezone: true }),
    /** Razão da revogação: `logout`, `logout_all`, `rotated`, `reuse_detected`. */
    revokedReason: varchar('revoked_reason', { length: 40 }),
    deviceInfo: varchar('device_info', { length: 200 }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    uniqueIndex('refresh_tokens_hash_unique').on(t.tokenHash),
    index('idx_refresh_tokens_user')
      .on(t.userId)
      .where(sql`${t.revokedAt} IS NULL`),
    index('idx_refresh_tokens_expiry').on(t.expiresAt),
  ],
);

export const passwordResetTokens = pgTable(
  'password_reset_tokens',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    tokenHash: varchar('token_hash', { length: 64 }).notNull(),
    expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
    usedAt: timestamp('used_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    uniqueIndex('password_reset_tokens_hash_unique').on(t.tokenHash),
    index('idx_password_reset_user').on(t.userId),
  ],
);

export const notifications = pgTable(
  'notifications',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    type: notificationType('type').notNull(),
    title: varchar('title', { length: 160 }).notNull(),
    body: text('body'),
    data: jsonb('data'),
    readAt: timestamp('read_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index('idx_notifications_user').on(t.userId, sql`${t.createdAt} DESC`)],
);

export const userBlocks = pgTable(
  'user_blocks',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    blockerId: uuid('blocker_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    blockedId: uuid('blocked_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    uniqueIndex('user_blocks_unique').on(t.blockerId, t.blockedId),
    check('user_blocks_not_self', sql`${t.blockerId} <> ${t.blockedId}`),
  ],
);

export const reports = pgTable(
  'reports',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    reporterId: uuid('reporter_id')
      .notNull()
      .references(() => users.id),
    targetUserId: uuid('target_user_id').references(() => users.id),
    bookingId: uuid('booking_id').references(() => bookings.id),
    reviewId: uuid('review_id').references(() => reviews.id),
    reason: text('reason').notNull(),
    status: reportStatus('status').notNull().default('open'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index('idx_reports_status').on(t.status, t.createdAt),
    index('idx_reports_target').on(t.targetUserId),
  ],
);

export const auditLog = pgTable(
  'audit_log',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    actorId: uuid('actor_id'),
    action: varchar('action', { length: 80 }).notNull(),
    entity: varchar('entity', { length: 60 }).notNull(),
    entityId: uuid('entity_id'),
    payload: jsonb('payload'),
    ip: varchar('ip', { length: 45 }),
    /** NF-O05 — correlation id entre app e log da API. */
    correlationId: varchar('correlation_id', { length: 64 }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index('idx_audit_entity').on(t.entity, t.entityId),
    index('idx_audit_actor').on(t.actorId, sql`${t.createdAt} DESC`),
  ],
);

export type RefreshToken = typeof refreshTokens.$inferSelect;
export type PasswordResetToken = typeof passwordResetTokens.$inferSelect;
export type Notification = typeof notifications.$inferSelect;
export type UserBlock = typeof userBlocks.$inferSelect;
export type Report = typeof reports.$inferSelect;
export type AuditLogEntry = typeof auditLog.$inferSelect;