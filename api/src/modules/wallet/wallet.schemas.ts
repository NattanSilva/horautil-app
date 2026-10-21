/**
 * Schemas Zod do módulo de carteira (espelhados nos DTOs Kotlin — ADR-003).
 *
 * `entryStatus` e `entryType` são reexportados dos enums do Drizzle para que o
 * contrato HTTP e o banco nunca divirjam.
 */
import { z } from 'zod';

import { entryStatus, entryType } from '../../db/schema/index.js';
import { toHoursMinutes } from '../../shared/datetime.js';

export const entryTypeSchema = z.enum(entryType.enumValues);
export const entryStatusSchema = z.enum(entryStatus.enumValues);

/** F4.2 — `GET /v1/me/wallet`. */
export const walletBalanceSchema = z.object({
  /** Saldo líquido: disponível + reservado. */
  total_minutes: z.number().int().describe('Saldo líquido (disponível + reservado)'),
  /** Reservado em sessões `pending`/`confirmed`. */
  held_minutes: z.number().int().describe('Minutos reservados em sessões abertas'),
  /** Gastável agora. */
  available_minutes: z.number().int().describe('Minutos disponíveis para agendar'),
  total_hours: z.number().describe('Mesmo que total_minutes, em horas (facilita o app)'),
  available_hours: z.number(),
  held_hours: z.number(),
  expires_at: z.string().nullable().optional().describe('Vencimento do crédito mais antigo'),
});

export const walletBalanceResponseSchema = z.object({ data: walletBalanceSchema });

/** Linha do extrato (F4.6 / JS-05). */
export const walletEntrySchema = z.object({
  id: z.uuid(),
  type: entryTypeSchema,
  status: entryStatusSchema,
  minutes: z.number().int().positive(),
  /** Snapshot do saldo disponível após o lançamento. */
  balance_after: z.number().int(),
  direction: z.enum(['credit', 'debit']).describe('Derivado do type: entra ou sai do saldo'),
  booking_id: z.uuid().nullable(),
  description: z.string().nullable(),
  expires_at: z.string().nullable(),
  created_at: z.string(),
});

export const walletEntriesResponseSchema = z.object({
  data: z.array(walletEntrySchema),
  meta: z.object({
    pagination: z.object({
      next_cursor: z.string().nullable(),
      has_more: z.boolean(),
      limit: z.number().int(),
    }),
  }),
});

/** F4.1 — resposta do crédito de boas-vindas. */
export const welcomeCreditResponseSchema = z.object({
  data: z.object({
    granted: z.boolean(),
    minutes: z.number().int(),
    balance_after: z.number().int().nullable(),
  }),
});

/** Query de extrato: `?limit=&cursor=&type=`. */
export const walletEntriesQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(100).default(20),
  cursor: z.string().min(1).optional(),
  type: entryTypeSchema.optional(),
});

/** Converte minutos em horas para o app (evita matemática duplicada no cliente). */
export function withHours<T extends { minutes: number }>(row: T) {
  return { ...row, hours: toHoursMinutes(row.minutes) };
}