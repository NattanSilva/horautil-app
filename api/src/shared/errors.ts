/**
 * Erros de aplicação e códigos padronizados (PRD §8.3).
 *
 * A API responde sempre no envelope `ErrorResponse`:
 * ```json
 * { "error": { "code": "INSUFFICIENT_CREDITS", "message": "...", "details": [...] },
 *   "correlation_id": "..." }
 * ```
 */
import { z } from 'zod';

/** PRD §8.3 — catálogo de `error_code`. */
export const ERROR_CODES = [
  'VALIDATION_ERROR',
  'UNAUTHORIZED',
  'TOKEN_EXPIRED',
  'FORBIDDEN',
  'INSUFFICIENT_ROLE',
  'NOT_FOUND',
  'CONFLICT',
  'SLOT_UNAVAILABLE',
  'DUPLICATE_SKILL',
  'INSUFFICIENT_CREDITS',
  'INVALID_TRANSITION',
  'RATE_LIMITED',
  'ACCOUNT_SUSPENDED',
  'INTERNAL_ERROR',
] as const;

export type ErrorCode = (typeof ERROR_CODES)[number];

/** Erro de aplicação com `statusCode` + `error_code` canônicos. */
export class AppError extends Error {
  readonly statusCode: number;
  readonly code: ErrorCode;
  readonly details?: unknown;
  /** Flag para o error handler não logar ruído esperado (4xx de negócio). */
  readonly expected = true;

  constructor(statusCode: number, code: ErrorCode, message: string, details?: unknown) {
    super(message);
    this.name = 'AppError';
    this.statusCode = statusCode;
    this.code = code;
    this.details = details;
    Error.captureStackTrace?.(this, AppError);
  }
}

export const badRequest = (message: string, details?: unknown) =>
  new AppError(400, 'VALIDATION_ERROR', message, details);

export const unauthorized = (message = 'Autenticação obrigatória.') =>
  new AppError(401, 'UNAUTHORIZED', message);

export const tokenExpired = (message = 'Sessão expirada. Faça login novamente.') =>
  new AppError(401, 'TOKEN_EXPIRED', message);

export const forbidden = (message = 'Você não tem acesso a este recurso.') =>
  new AppError(403, 'FORBIDDEN', message);

export const accountSuspended = (message = 'Sua conta está temporariamente suspensa.') =>
  new AppError(403, 'ACCOUNT_SUSPENDED', message);

export const notFound = (entity = 'Recurso') =>
  new AppError(404, 'NOT_FOUND', `${entity} não encontrado.`);

export const conflict = (code: Extract<ErrorCode, 'CONFLICT' | 'SLOT_UNAVAILABLE' | 'DUPLICATE_SKILL'>, message: string) =>
  new AppError(409, code, message);

export const insufficientCredits = (message = 'Saldo disponível insuficiente para esta sessão.') =>
  new AppError(422, 'INSUFFICIENT_CREDITS', message);

export const invalidTransition = (message = 'Transição de estado inválida para este agendamento.') =>
  new AppError(422, 'INVALID_TRANSITION', message);

export const rateLimited = (message = 'Muitas requisições. Tente novamente em instantes.') =>
  new AppError(429, 'RATE_LIMITED', message);

export const internal = (message = 'Erro interno.') => new AppError(500, 'INTERNAL_ERROR', message);

/** Detalhe de campo de erro de validação (serializado com segurança ao cliente). */
export const fieldIssueSchema = z.object({
  path: z.string(),
  message: z.string(),
});

/** Envelope de erro (PRD §8.3). */
export const errorResponseSchema = z.object({
  error: z.object({
    code: z.enum(ERROR_CODES),
    message: z.string(),
    details: z.array(fieldIssueSchema).optional(),
  }),
  correlation_id: z.string().optional(),
});

export type ErrorResponse = z.infer<typeof errorResponseSchema>;