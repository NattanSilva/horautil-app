/**
 * Global Error Handler — PRD §8.3.
 *
 * Responsabilidades:
 *  1. traduzir `AppError` para o envelope `ErrorResponse` com `error_code` canônico;
 *  2. traduzir erros de validação do Zod (`@fastify/type-provider-zod`) para `VALIDATION_ERROR` (400);
 *  3. traduzir violações de unicidade/CHECK do Postgres (`error.code === '23505' | '23514' | '23P01'`)
 *     para erros de negócio (`409 SLOT_UNAVAILABLE`, `409 DUPLICATE_SKILL`);
 *  4. **nunca** expor stack trace, SQL ou mensagem interna em produção (NF-S12 / segurança);
 *  5. responder `429 RATE_LIMITED` no formato padrão quando o `@fastify/rate-limit` barrar;
 *  6. registrar `5xx` com `correlation_id` (NF-O05) para rastreio no Sentry.
 */
import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import {
  hasZodFastifySchemaValidationErrors,
  isResponseSerializationError,
} from '@fastify/type-provider-zod';

import { isProd } from '../config/env.js';
import { AppError, type ErrorCode, type ErrorResponse } from './errors.js';

/** Código Postgres → erro de domínio. */
const PG_ERROR_MAP: Record<string, { status: number; code: ErrorCode; message: string }> = {
  // 23505 unique_violation
  'user_skills_user_category_mode_unique': {
    status: 409,
    code: 'DUPLICATE_SKILL',
    message: 'Você já declarou esta habilidade neste modo.',
  },
  'reviews_booking_unique': {
    status: 409,
    code: 'CONFLICT',
    message: 'Esta sessão já foi avaliada.',
  },
  'wallet_entries_welcome_bonus_unique': {
    status: 409,
    code: 'CONFLICT',
    message: 'Bônus de boas-vindas já creditado.',
  },
  'wallet_entries_idempotency_unique': {
    status: 409,
    code: 'CONFLICT',
    message: 'Operação já processada.',
  },
  // 23P01 exclusion_violation (EXCLUDE USING gist — BR-306)
  'bookings_teacher_no_overlap': {
    status: 409,
    code: 'SLOT_UNAVAILABLE',
    message: 'Este horário acabou de ser reservado. Escolha outro.',
  },
  // 23514 check_violation
  'bookings_distinct_participants': {
    status: 422,
    code: 'INVALID_TRANSITION',
    message: 'Aluno e instrutor não podem ser a mesma pessoa.',
  },
  'bookings_duration_valid': {
    status: 400,
    code: 'VALIDATION_ERROR',
    message: 'Duração deve ser múltiplo de 30 minutos, entre 30 e 180.',
  },
  'availability_30min_alignment': {
    status: 400,
    code: 'VALIDATION_ERROR',
    message: 'Horários devem estar alinhados à grade de 30 minutos.',
  },
  'availability_time_order': {
    status: 400,
    code: 'VALIDATION_ERROR',
    message: 'O fim do horário deve ser maior que o início.',
  },
  'availability_weekday_range': {
    status: 400,
    code: 'VALIDATION_ERROR',
    message: 'Dia da semana inválido (0 = domingo … 6 = sábado).',
  },
  'user_skills_teach_requires_level': {
    status: 400,
    code: 'VALIDATION_ERROR',
    message: 'Habilidades ensinadas exigem nível (BR-202).',
  },
  'reviews_rating_range': {
    status: 400,
    code: 'VALIDATION_ERROR',
    message: 'A nota deve ser um inteiro de 1 a 5.',
  },
  'reviews_comment_length': {
    status: 400,
    code: 'VALIDATION_ERROR',
    message: 'O comentário deve ter entre 10 e 500 caracteres.',
  },
  'wallet_minutes_positive': {
    status: 400,
    code: 'VALIDATION_ERROR',
    message: 'Lançamento de carteira deve ter minutos positivos.',
  },
};

/** 23505 sem constraint conhecida → conflito genérico. */
const UNIQUE_FALLBACK = { status: 409, code: 'CONFLICT' as ErrorCode, message: 'Recurso já existe.' };

export function registerErrorHandler(app: FastifyInstance): void {
  app.setErrorHandler(function errorHandler(error, request: FastifyRequest, reply: FastifyReply) {
    const correlationId = request.id;

    // ── 1. Erros de aplicação (regras de negócio) ────────────────────────
    if (error instanceof AppError) {
      if (error.statusCode >= 500) {
        request.log.error({ err: error, correlationId }, 'app error');
      }
      return send(reply, error.statusCode, {
        error: {
          code: error.code,
          message: error.message,
          ...(Array.isArray(error.details) ? { details: error.details } : {}),
        },
        correlation_id: correlationId,
      });
    }

    // ── 2. Erros de validação do Zod (body/query/params) ──────────────────
    if (hasZodFastifySchemaValidationErrors(error)) {
      return send(reply, 400, {
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Payload inválido.',
          details: error.validation.map((issue) => ({
            path: issue.instancePath?.replace(/^\//, '') || issue.keyword || '',
            message: issue.message,
          })),
        },
        correlation_id: correlationId,
      });
    }

    // ── 3. Falha de serialização da resposta (bug de contrato) ────────────
    if (isResponseSerializationError(error)) {
      request.log.error({ err: error, correlationId }, 'response serialization error');
      return send(reply, 500, {
        error: { code: 'INTERNAL_ERROR', message: 'Erro interno.' },
        correlation_id: correlationId,
      });
    }

    // ── 4. Rate limiting (@fastify/rate-limit) ───────────────────────────
    const fastifyError = error as { statusCode?: number; code?: string; message?: string };
    if (fastifyError.statusCode === 429 || fastifyError.code === 'FST_ERR_RATE_LIMIT') {
      return send(reply, 429, {
        error: { code: 'RATE_LIMITED', message: 'Muitas requisições. Tente novamente em instantes.' },
        correlation_id: correlationId,
      });
    }

    // ── 5. Erros do Postgres mapeados para domínio ───────────────────────
    const pgError = error as { code?: string; constraint?: string; detail?: string };
    if (pgError.code === '23P01' || pgError.code === '23505' || pgError.code === '23514') {
      const mapped = pgError.constraint
        ? PG_ERROR_MAP[pgError.constraint]
        : pgError.code === '23505'
          ? UNIQUE_FALLBACK
          : undefined;
      if (mapped) {
        return send(reply, mapped.status, {
          error: { code: mapped.code, message: mapped.message },
          correlation_id: correlationId,
        });
      }
      request.log.warn({ err: error, constraint: pgError.constraint }, 'constraint violation');
      return send(reply, 409, {
        error: { code: 'CONFLICT', message: UNIQUE_FALLBACK.message },
        correlation_id: correlationId,
      });
    }

    // ── 6. Payload acima do limite (NF-S05) ──────────────────────────────
    if (fastifyError.statusCode === 413 || fastifyError.code === 'FST_ERR_CTP_BODY_TOO_LARGE') {
      return send(reply, 413, {
        error: { code: 'VALIDATION_ERROR', message: 'Payload acima de 1 MB.' },
        correlation_id: correlationId,
      });
    }

    // ── 7. 404 de rota ───────────────────────────────────────────────────
    if (fastifyError.statusCode === 404) {
      return send(reply, 404, {
        error: { code: 'NOT_FOUND', message: 'Rota não encontrada.' },
        correlation_id: correlationId,
      });
    }

    // ── 8. Demais 4xx do Fastify (ex.: JSON malformado) ──────────────────
    if (typeof fastifyError.statusCode === 'number' && fastifyError.statusCode < 500) {
      return send(reply, fastifyError.statusCode, {
        error: {
          code: 'VALIDATION_ERROR',
          message: fastifyError.message ?? 'Requisição inválida.',
        },
        correlation_id: correlationId,
      });
    }

    // ── 9. Inesperado: loga com contexto, responde opaco (sem stack trace) ─
    request.log.error({ err: error, correlationId }, 'unhandled error');
    return send(reply, 500, {
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Erro interno. Contate o suporte com o correlation_id.',
        ...(isProd ? {} : { details: [{ path: 'stack', message: (error as Error).stack ?? '' }] }),
      },
      correlation_id: correlationId,
    });
  });

  // Handler para 404 de rota (registrado como handler de erro padrão do Fastify).
  app.setNotFoundHandler((request, reply) =>
    send(reply, 404, {
      error: { code: 'NOT_FOUND', message: `Rota ${request.method} ${request.url} não encontrada.` },
      correlation_id: request.id,
    }),
  );
}

function send(reply: FastifyReply, statusCode: number, body: ErrorResponse): FastifyReply {
  return reply.status(statusCode).type('application/json').send(body);
}