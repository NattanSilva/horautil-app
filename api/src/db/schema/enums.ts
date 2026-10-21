/**
 * Enums do banco — PRD §7.3.
 *
 * Nomes de tipo no Postgres idênticos aos do PRD para facilitar auditoria
 * e migração entre ambientes.
 */
import { pgEnum } from 'drizzle-orm/pg-core';

/** PRD §7.3 — `skill_mode`: `teach` | `learn`. */
export const skillMode = pgEnum('skill_mode', ['teach', 'learn']);

/** PRD §7.3 — `skill_level`. Obrigatório quando `mode = 'teach'` (BR-202). */
export const skillLevel = pgEnum('skill_level', ['beginner', 'intermediate', 'advanced']);

/** PRD §7.2 — `users.status`. BR-004/BR-403/BR-407. */
export const userStatus = pgEnum('user_status', ['active', 'suspended', 'deleted']);

/** PRD §3.2 — máquina de estados do agendamento. */
export const bookingStatus = pgEnum('booking_status', [
  'pending',
  'confirmed',
  'awaiting_confirmation',
  'completed',
  'declined',
  'cancelled_student',
  'cancelled_teacher',
  'no_show',
]);

/** PRD §7.3 — `entry_type`. */
export const entryType = pgEnum('entry_type', [
  'welcome_bonus',
  'session_earned',
  'session_spent',
  'refund',
  'penalty',
  'adjustment',
  'reversal',
  'expiry',
]);

/** PRD §7.3 — `entry_status`. */
export const entryStatus = pgEnum('entry_status', [
  'held',
  'posted',
  'released',
  'expired',
  'reversed',
]);

// Tipos auxiliares do MVP
export const meetingType = pgEnum('meeting_type', ['online', 'in_person', 'external']);
export const reportStatus = pgEnum('report_status', ['open', 'reviewing', 'resolved', 'dismissed']);
export const notificationType = pgEnum('notification_type', [
  'booking_requested',
  'booking_accepted',
  'booking_declined',
  'booking_cancelled',
  'booking_completed',
  'confirm_completion',
  'review_requested',
  'credits_expiring',
  'system',
]);

// ── Inferências de tipo para uso nos contratos/serviços ──────────────
export type SkillMode = (typeof skillMode.enumValues)[number];
export type SkillLevel = (typeof skillLevel.enumValues)[number];
export type UserStatus = (typeof userStatus.enumValues)[number];
export type BookingStatus = (typeof bookingStatus.enumValues)[number];
export type EntryType = (typeof entryType.enumValues)[number];
export type EntryStatus = (typeof entryStatus.enumValues)[number];
export type MeetingType = (typeof meetingType.enumValues)[number];
export type ReportStatus = (typeof reportStatus.enumValues)[number];
export type NotificationType = (typeof notificationType.enumValues)[number];