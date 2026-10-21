/**
 * Schemas Zod de autenticação (PRD F1.1..F1.3).
 *
 * BR-001/BR-002 são validados aqui para que o cliente receba feedback imediato e a
 * senha nunca chegue ao repositório em formato inseguro.
 */
import { z } from 'zod';

import { BR } from '../../config/constants.js';

/** F1.1 — cadastro. */
export const registerBodySchema = z.object({
  email: z.email('Informe um e-mail válido.').max(255),
  password: z
    .string()
    .min(BR.MIN_PASSWORD_LENGTH, `A senha deve ter no mínimo ${BR.MIN_PASSWORD_LENGTH} caracteres.`)
    .max(BR.MAX_PASSWORD_LENGTH)
    .regex(/[a-zA-Z]/, 'A senha deve conter ao menos uma letra.')
    .regex(/\d/, 'A senha deve conter ao menos um número.'),
  name: z
    .string()
    .trim()
    .min(2, 'Informe seu nome.')
    .max(120, 'Nome muito longo (máx. 120 caracteres).'),
  // BR-006 — aceite explícito dos termos (idade mínima 16 anos).
  accepted_terms: z.boolean().default(true),
  device_info: z.string().max(200).optional(),
});

/** F1.2 — login. */
export const loginBodySchema = z.object({
  email: z.email('Informe um e-mail válido.').max(255),
  password: z.string().min(1, 'Informe a senha.').max(BR.MAX_PASSWORD_LENGTH),
  device_info: z.string().max(200).optional(),
});

/** F1.2 — refresh (token também é lido do cookie HttpOnly). */
export const refreshBodySchema = z.object({
  refresh_token: z.string().min(10).optional(),
});

/** F1.3 — solicitar recuperação. */
export const forgotPasswordBodySchema = z.object({
  email: z.email('Informe um e-mail válido.').max(255),
});

/** F1.3 — trocar a senha. */
export const resetPasswordBodySchema = z.object({
  token: z.string().min(10, 'Token inválido.'),
  password: z
    .string()
    .min(BR.MIN_PASSWORD_LENGTH, `A senha deve ter no mínimo ${BR.MIN_PASSWORD_LENGTH} caracteres.`)
    .max(BR.MAX_PASSWORD_LENGTH)
    .regex(/[a-zA-Z]/, 'A senha deve conter ao menos uma letra.')
    .regex(/\d/, 'A senha deve conter ao menos um número.'),
});

/** Sessão retornada por register/login/refresh. */
export const sessionUserSchema = z.object({
  id: z.uuid(),
  name: z.string(),
  city: z.string().nullable(),
  timezone: z.string(),
  onboarding_completed_at: z.string().nullable(),
});

export const authSessionSchema = z.object({
  access_token: z.string(),
  /** TTL do access token em segundos. */
  expires_in: z.number().int(),
  refresh_token: z.string().describe('Também enviado em cookie HttpOnly (NF-S13).'),
  onboarding_completed: z.boolean(),
  user: sessionUserSchema,
});

export const authResponseSchema = z.object({ data: authSessionSchema });

export const logoutResponseSchema = z.object({
  data: z.object({ revoked: z.boolean() }),
});

export const logoutAllResponseSchema = z.object({
  data: z.object({ revoked_sessions: z.number().int() }),
});

export const genericOkResponseSchema = z.object({
  data: z.object({ ok: z.boolean() }),
});

/** Headers aceitos nas rotas de auth (documentação OpenAPI). */
export const deviceHeaderSchema = z.object({
  'x-device-id': z.string().max(200).optional(),
  'x-device-platform': z.string().max(40).optional(),
});