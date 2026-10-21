/**
 * `wallet_entries` — ledger **append-only** (ADR-001, BR-109).
 *
 * Invariantes garantidas aqui:
 *  1. `minutes` é sempre > 0 e representa o **valor absoluto**; o sinal vem do `type`
 *     (crédito: `welcome_bonus | session_earned | refund | adjustment`; débito: `session_spent | penalty | expiry`);
 *  2. nunca existe coluna de saldo em `users` — o saldo é derivado (view `user_wallet_balance`);
 *  3. `balance_after` carrega o snapshot do saldo **disponível** após o lançamento (auditoria / JS-05);
 *  4. correção é feita por `reversal`/`refund`/`penalty` (novo INSERT), nunca editando
 *     `minutes`, `type`, `user_id` ou `booking_id` de um lançamento existente.
 *
 * A **única** mutação permitida é a transição de status da reserva,
 * `held → released` / `held → posted` (ver `wallet.repository.ts`), executada dentro de uma
 * transação com `SELECT ... FOR UPDATE` (BR-108) e sempre registrada em `audit_log` (BR-705).
 * Sem essa transição, o `held` de uma reserva seria somado para sempre e o saldo derivado
 * ficaria incorreto — ver README → "ADR-006: ciclo de vida da reserva".
 */
import { sql } from 'drizzle-orm';
import {
  check,
  index,
  integer,
  pgTable,
  timestamp,
  uniqueIndex,
  uuid,
  varchar,
} from 'drizzle-orm/pg-core';

import { bookings } from './bookings.js';
import { entryStatus, entryType } from './enums.js';
import { users } from './users.js';

export const walletEntries = pgTable(
  'wallet_entries',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id),
    bookingId: uuid('booking_id').references(() => bookings.id),
    type: entryType('type').notNull(),
    /** Valor absoluto em minutos (> 0). O sinal é derivado de `type`. */
    minutes: integer('minutes').notNull(),
    status: entryStatus('status').notNull().default('posted'),
    /** BR-105 / BR-106 — validade do crédito contada da entrada. */
    expiresAt: timestamp('expires_at', { withTimezone: true }),
    /** Snapshot do saldo disponível após o lançamento (auditoria). */
    balanceAfter: integer('balance_after').notNull(),
    description: varchar('description', { length: 200 }),
    /** Marca a reserva de um agendamento — permite reencontrar o `hold` pelo `booking_id`. */
    idempotencyKey: varchar('idempotency_key', { length: 120 }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    // BR-108 / leitura de saldo
    index('idx_wallet_user_status').on(t.userId, t.status),
    // BR-105 — job de expiração FIFO
    index('idx_wallet_expiry').on(t.expiresAt).where(sql`${t.status} = 'posted'`),
    index('idx_wallet_booking').on(t.bookingId),
    // BR-109 — idempotência: um lançamento por (usuário, chave)
    uniqueIndex('wallet_entries_idempotency_unique')
      .on(t.userId, t.idempotencyKey)
      .where(sql`${t.idempotencyKey} IS NOT NULL`),
    // BR-101 — o bônus de boas-vindas só pode ser creditado uma vez
    uniqueIndex('wallet_entries_welcome_bonus_unique')
      .on(t.userId)
      .where(sql`${t.type} = 'welcome_bonus'`),
    check('wallet_minutes_positive', sql`${t.minutes} > 0`),
  ],
);

export type WalletEntry = typeof walletEntries.$inferSelect;
export type NewWalletEntry = typeof walletEntries.$inferInsert;

/** Tipos que aumentam o saldo (créditos). */
export const CREDIT_TYPES: readonly (typeof entryType.enumValues)[number][] = [
  'welcome_bonus',
  'session_earned',
  'refund',
  'adjustment',
];

/** Tipos que consomem o saldo (débitos). */
export const DEBIT_TYPES: readonly (typeof entryType.enumValues)[number][] = [
  'session_spent',
  'penalty',
  'expiry',
  'reversal',
];

/**
 * Retorna `+1` para tipos de crédito e `-1` para tipos de débito.
 *
 * `reversal` (BR-109) é sempre lançado como **débito**: reverter um crédito é um `reversal`,
 * e reverter um débito é um `refund` (novo lançamento de crédito). Assim o sinal nunca
 * depende de estado anterior do lançamento revolvido.
 */
export function entrySign(type: string): 1 | -1 {
  return CREDIT_TYPES.includes(type as never) ? 1 : -1;
}