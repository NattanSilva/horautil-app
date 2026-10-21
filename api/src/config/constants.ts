/**
 * Constantes de negócio extraídas do PRD v1.1.
 *
 * Todas as regras BR-xxx ficam aqui (ou no serviço correspondente) com o ID do PRD
 * ao lado, para que o time de 5 devs possa auditar a implementação contra o documento.
 */

export const API_PREFIX = '/v1';

// ─────────────────────────────────────────────────────────────
// Conta e onboarding (§5.1)
// ─────────────────────────────────────────────────────────────
export const BR = {
  MIN_PASSWORD_LENGTH: 8, // BR-002
  MAX_PASSWORD_LENGTH: 128,
  MIN_AGE_YEARS: 16, // BR-006
  ACCOUNT_DELETION_DAYS: 30, // BR-007
  MAX_SKILLS_PER_MODE: 10, // BR-203
  MAX_BIO_LENGTH: 500,
  MAX_SKILL_DESCRIPTION_LENGTH: 300,
} as const;

// ─────────────────────────────────────────────────────────────
// Créditos e saldo (§5.2)
// ─────────────────────────────────────────────────────────────
export const WALLET = {
  WELCOME_BONUS_MINUTES: 120, // BR-101
  /** BR-102: sem markup — 1 h de aula = 1 h de crédito. */
  MINUTES_PER_CREDIT: 1,
  /** BR-105: cada crédito expira 90 dias corridos após a entrada. */
  EXPIRY_DAYS: 90,
  /** BR-106: carência de 45 dias para bônus não utilizado. */
  BONUS_GRACE_DAYS: 45,
} as const;

// ─────────────────────────────────────────────────────────────
// Agendamento (§5.4)
// ─────────────────────────────────────────────────────────────
export const BOOKING = {
  MIN_DURATION_MINUTES: 30, // BR-301
  MAX_DURATION_MINUTES: 180, // BR-301
  DURATION_STEP_MINUTES: 30, // BR-301
  /** Granularidade da agenda (BR "Duração e granularidade"). */
  SLOT_GRANULARITY_MINUTES: 30,
  MIN_ADVANCE_HOURS: 2, // BR-302
  MAX_ADVANCE_DAYS: 90, // BR-303
  PENDING_EXPIRY_HOURS: 48, // BR-304
  COMPLETION_CONFIRMATION_TIMEOUT_HOURS: 24, // BR-309
  CHECK_IN_TOLERANCE_MINUTES: 30, // BR-308
  CANCELLATION_FULL_REFUND_HOURS: 12, // §5.5
  CANCELLATION_PARTIAL_REFUND_HOURS: 2, // §5.5
  CANCELLATION_PARTIAL_REFUND_RATIO: 0.5,
  NO_SHOW_CANCELLATION_THRESHOLD: 2, // BR-404
  LATE_CANCELLATION_THRESHOLD: 3, // BR-403
  LATE_CANCELLATION_WINDOW_DAYS: 90,
  LATE_CANCELLATION_SUSPENSION_DAYS: 14, // BR-403
  MAX_MESSAGE_LENGTH: 500,
} as const;

// ─────────────────────────────────────────────────────────────
// Avaliações (§5.6)
// ─────────────────────────────────────────────────────────────
export const REVIEW = {
  MIN_RATING: 1,
  MAX_RATING: 5,
  MIN_COMMENT_LENGTH: 10, // BR-504
  MAX_COMMENT_LENGTH: 500, // BR-504
  MAX_REPLY_LENGTH: 300,
  DEADLINE_DAYS: 7, // BR-503
  EDIT_WINDOW_HOURS: 24, // BR-505
  /** BR-506: peso = 1 / (1 + meses/6). */
  RECENCY_DECAY_MONTHS: 6,
  /** F5.7 — badge de instrutor confiável. */
  RELIABLE_TEACHER_MIN_SESSIONS: 5,
  RELIABLE_TEACHER_MIN_RATING: 4.5,
} as const;

// ─────────────────────────────────────────────────────────────
// Matching (§3.2, F2.4) — pesos em configuração, sem deploy (PRD)
// ─────────────────────────────────────────────────────────────
export const MATCHING_WEIGHTS = {
  skillMatch: 0.4,
  rating: 0.2,
  mutualInterest: 0.15,
  availabilityOverlap: 0.15,
  activityRecency: 0.1,
} as const;

export const RATE_LIMIT = {
  /** BR-703 / NF-S06 */
  GLOBAL_MAX: 100,
  GLOBAL_WINDOW: '1 minute',
  AUTH_MAX: 10,
  AUTH_WINDOW: '1 minute',
} as const;

/** Tipos do ledger que aumentam o saldo (entrada de crédito). */
export const CREDIT_ENTRY_TYPES = ['welcome_bonus', 'session_earned', 'refund', 'adjustment'] as const;
/** Tipos do ledger que consomem saldo (saída de crédito). */
export const DEBIT_ENTRY_TYPES = ['session_spent', 'penalty', 'expiry'] as const;

/** Estados terminais de um agendamento — não aceitam mais transições. */
export const TERMINAL_BOOKING_STATUSES = [
  'completed',
  'declined',
  'cancelled_student',
  'cancelled_teacher',
  'no_show',
] as const;

/** Estados em que o horário do instrutor está bloqueado (EXCLUDE USING gist). */
export const BLOCKING_BOOKING_STATUSES = ['confirmed', 'awaiting_confirmation'] as const;