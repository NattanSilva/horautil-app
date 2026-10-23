/**
 * Rotas HTTP da carteira (Dev 4 — PRD §8.2):
 *  - `GET  /v1/me/wallet`             → saldo atual (F4.2)
 *  - `GET  /v1/me/wallet/entries`     → extrato paginado (F4.6)
 *  - `POST /v1/wallet/welcome-credit` → bônus de boas-vindas (F4.1, idempotente)
 */
import type { FastifyPluginAsync } from 'fastify';

import { db } from '../../db/client.js';
import { requireActiveUser, requireUserId } from '../../shared/auth/guards.js';
import { errorResponseSchema } from '../../shared/errors.js';
import { decodeCursor } from '../../shared/pagination.js';
import { findNextExpiry } from './wallet.repository.js';
import { claimWelcomeBonus, getStatement, getWalletSummary } from './wallet.service.js';
import {
  walletBalanceResponseSchema,
  walletEntriesQuerySchema,
  walletEntriesResponseSchema,
  welcomeCreditResponseSchema,
} from './wallet.schemas.js';

export const walletRoutes: FastifyPluginAsync = async (app) => {
  // ── F4.2 — saldo atual ──────────────────────────────────────────────────────
  app.get(
    '/me/wallet',
    {
      preHandler: requireActiveUser,
      schema: {
        tags: ['wallet'],
        summary: 'Saldo de horas do usuário autenticado',
        description:
          'Saldo **derivado** do ledger (ADR-001): `available` (gastável agora), `held` (reservado em sessões abertas) e `total` (líquido = disponível + reservado). Nunca há coluna de saldo em `users`.',
        response: {
          200: walletBalanceResponseSchema,
          401: errorResponseSchema,
        },
      },
    },
    async (request) => {
      const userId = requireUserId(request);
      const [balance, nextExpiry] = await Promise.all([
        getWalletSummary(userId),
        findNextExpiry(db, userId),
      ]);
      return {
        data: {
          total_minutes: balance.total_minutes,
          held_minutes: balance.held_minutes,
          available_minutes: balance.available_minutes,
          total_hours: balance.total_minutes / 60,
          available_hours: balance.available_minutes / 60,
          held_hours: balance.held_minutes / 60,
          expires_at: nextExpiry?.toISOString() ?? null,
        },
      };
    },
  );

  // ── F4.6 — extrato paginado ─────────────────────────────────────────────────
  app.get(
    '/me/wallet/entries',
    {
      preHandler: requireActiveUser,
      schema: {
        tags: ['wallet'],
        summary: 'Extrato de transações (paginado por cursor)',
        description:
          'Cada linha traz `minutes`, `direction` e `balance_after` (saldo após o lançamento), atendendo o JS-05.',
        querystring: walletEntriesQuerySchema,
        response: {
          200: walletEntriesResponseSchema,
          400: errorResponseSchema,
          401: errorResponseSchema,
        },
      },
    },
    async (request) => {
      const userId = requireUserId(request);
      const query = walletEntriesQuerySchema.parse(request.query);
      const rows = await getStatement(userId, {
        limit: query.limit,
        cursor: decodeCursor(query.cursor),
        type: query.type,
      });

      const hasMore = rows.length > query.limit;
      const page = hasMore ? rows.slice(0, query.limit) : rows;
      const data = page.map((row) => ({
        id: row.id,
        type: row.type,
        status: row.status,
        minutes: row.minutes,
        balance_after: row.balanceAfter,
        direction: directionOf(row.type, row.status),
        booking_id: row.bookingId,
        description: row.description,
        expires_at: row.expiresAt?.toISOString() ?? null,
        created_at: row.createdAt.toISOString(),
      }));

      const last = data.at(-1);
      return {
        data,
        meta: {
          pagination: {
            next_cursor:
              hasMore && last
                ? Buffer.from(`${last.created_at}|${last.id}`, 'utf8').toString('base64url')
                : null,
            has_more: hasMore,
            limit: query.limit,
          },
        },
      };
    },
  );

  // ── F4.1 — bônus de boas-vindas (idempotente) ───────────────────────────────
  app.post(
    '/wallet/welcome-credit',
    {
      preHandler: requireActiveUser,
      schema: {
        tags: ['wallet'],
        summary: 'Bônus de boas-vindas (+120 min)',
        description:
          'Concedido automaticamente ao concluir o onboarding (BR-101). Idempotente: retorna `granted: false` quando o bônus já foi creditado.',
        response: {
          200: welcomeCreditResponseSchema,
          401: errorResponseSchema,
          422: errorResponseSchema,
        },
      },
    },
    async (request) => {
      const userId = requireUserId(request);
      const result = await claimWelcomeBonus(userId, {
        actorId: userId,
        ip: request.ip,
        correlationId: request.id,
      });
      return {
        data: {
          granted: result !== null,
          minutes: result?.minutes ?? 0,
          balance_after: result?.balanceAfter ?? null,
        },
      };
    },
  );
};

/** `credit` aumenta o saldo; `debit` consome — seja reserva, gasto ou expiração. */
function directionOf(type: string, status: string): 'credit' | 'debit' {
  if (status === 'held') return 'debit';
  const creditTypes = new Set(['welcome_bonus', 'session_earned', 'refund', 'adjustment']);
  return creditTypes.has(type) ? 'credit' : 'debit';
}