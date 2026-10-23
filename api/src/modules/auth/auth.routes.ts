/**
 * Rotas HTTP de autenticação (Dev 1 — PRD §8.2 / F1.1..F1.4).
 *
 * Rate limit mais rígido: 10 req/min (BR-703 / NF-S06).
 * O refresh token viaja **duas vezes**: no body (cliente não-browser) e em cookie
 * `HttpOnly; Secure; SameSite=Strict` (NF-S13). O access token fica só na memória do app.
 */
import type { FastifyPluginAsync } from 'fastify';
import '@fastify/cookie';
import '@fastify/jwt';

import { env } from '../../config/env.js';
import { refreshCookieOptions } from '../../shared/auth/tokens.js';
import { requireAuth, requireUserId } from '../../shared/auth/guards.js';
import { errorResponseSchema } from '../../shared/errors.js';
import { authRateLimitConfig } from '../../plugins/security.js';
import {
  forgotPasswordBodySchema,
  loginBodySchema,
  logoutAllResponseSchema,
  logoutResponseSchema,
  authResponseSchema,
  genericOkResponseSchema,
  refreshBodySchema,
  registerBodySchema,
  resetPasswordBodySchema,
} from './auth.schemas.js';
import {
  loginUser,
  logout,
  logoutAll,
  refreshSession,
  registerUser,
  requestPasswordReset,
  resetPassword,
  type AccessTokenSigner,
} from './auth.service.js';

export const authRoutes: FastifyPluginAsync = async (app) => {
  /** Injeta o `app.jwt` do Fastify no serviço, mantendo o serviço desacoplado do HTTP. */
  const sign: AccessTokenSigner = async ({ userId, email }) =>
    (app as any).jwt.sign({ sub: userId, email, typ: 'access' }, { expiresIn: env.JWT_ACCESS_TTL });

  const ctxOf = (request: any) => ({
    actorId: request.user?.sub ?? null,
    ip: request.ip,
    correlationId: request.id,
  });

  /** Envia o refresh token no cookie HttpOnly e devolve o mesmo valor no body. */
  const sendSession = (
    reply: any,
    result: any,
  ) => {
    reply.setCookie(env.REFRESH_COOKIE_NAME, result.refresh_token, refreshCookieOptions(new Date()));
    return reply.send({ data: result });
  };

  // ── F1.1 — cadastro ──────────────────────────────────────────────────────────
  app.post(
    '/auth/register',
    {
      config: { rateLimit: authRateLimitConfig },
      schema: {
        tags: ['auth'],
        summary: 'Criar conta',
        description:
          'Cadastro por e-mail + senha forte (BR-002). Retorna access token (15 min) e refresh token opaco (30 dias, rotativo).',
        body: registerBodySchema,
        response: {
          201: authResponseSchema,
          400: errorResponseSchema,
          409: errorResponseSchema,
          429: errorResponseSchema,
        },
      },
    },
    async (request: any, reply: any) => {
      const result = await registerUser(
        {
          email: request.body.email,
          password: request.body.password,
          name: request.body.name,
          acceptedTerms: request.body.accepted_terms,
        },
        ctxOf(request),
        sign,
      );
      request.log.info({ userId: result.user.id }, 'user registered');
      reply.status(201);
      return sendSession(reply, result);
    },
  );

  // ── F1.2 — login ────────────────────────────────────────────────────────────
  app.post(
    '/auth/login',
    {
      config: { rateLimit: authRateLimitConfig },
      schema: {
        tags: ['auth'],
        summary: 'Autenticar',
        description: 'E-mail + senha. Mensagem de erro genérica (não revela se o e-mail existe).',
        body: loginBodySchema,
        response: {
          200: authResponseSchema,
          400: errorResponseSchema,
          401: errorResponseSchema,
          429: errorResponseSchema,
        },
      },
    },
    async (request: any, reply: any) => {
      const result = await loginUser(
        { email: request.body.email, password: request.body.password },
        ctxOf(request),
        sign,
      );
      return sendSession(reply, result);
    },
  );

  // ── F1.2 — refresh ───────────────────────────────────────────────────────────
  app.post(
    '/auth/refresh',
    {
      config: { rateLimit: authRateLimitConfig },
      schema: {
        tags: ['auth'],
        summary: 'Renovar access token (rotação de refresh token)',
        description:
          'Rota pública: a identidade vem do próprio refresh token (cookie HttpOnly ou body). ' +
          'Cada uso rotaciona o token; reuso de token já rotacionado revoga toda a família.',
        body: refreshBodySchema,
        response: {
          200: authResponseSchema,
          400: errorResponseSchema,
          401: errorResponseSchema,
          429: errorResponseSchema,
        },
      },
    },
    async (request: any, reply: any) => {
      const fromCookie = request.cookies?.[env.REFRESH_COOKIE_NAME];
      const rawToken = fromCookie ?? request.body?.refresh_token;
      if (!rawToken) {
        return reply.status(401).send({
          error: { code: 'UNAUTHORIZED', message: 'Refresh token ausente.' },
          correlation_id: request.id,
        });
      }
      const result = await refreshSession(rawToken, ctxOf(request), sign);
      return sendSession(reply, result);
    },
  );

  // ── F1.2 — logout ────────────────────────────────────────────────────────────
  app.post(
    '/auth/logout',
    {
      preHandler: requireAuth,
      schema: {
        tags: ['auth'],
        summary: 'Revogar a sessão atual',
        response: { 200: logoutResponseSchema, 401: errorResponseSchema },
      },
    },
    async (request: any, reply: any) => {
      const userId = requireUserId(request);
      const rawToken = request.cookies?.[env.REFRESH_COOKIE_NAME];
      await logout(rawToken, userId, ctxOf(request));
      reply.clearCookie(env.REFRESH_COOKIE_NAME, { path: '/v1/auth' });
      return { data: { revoked: true } };
    },
  );

  // ── F1.4 — logout de todos os dispositivos ──────────────────────────────────
  app.post(
    '/auth/logout-all',
    {
      preHandler: requireAuth,
      schema: {
        tags: ['auth'],
        summary: 'Revogar todas as sessões ("sair de todos os dispositivos")',
        response: {
          200: logoutAllResponseSchema,
          401: errorResponseSchema,
        },
      },
    },
    async (request: any) => {
      const userId = requireUserId(request);
      const revoked = await logoutAll(userId, ctxOf(request));
      return { data: { revoked_sessions: revoked } };
    },
  );

  // ── F1.3 — recuperação de senha ─────────────────────────────────────────────
  app.post(
    '/auth/forgot-password',
    {
      config: { rateLimit: authRateLimitConfig },
      schema: {
        tags: ['auth'],
        summary: 'Solicitar recuperação de senha',
        description: 'Responde sempre `200`, exista ou não o e-mail (anti enumeração de contas).',
        body: forgotPasswordBodySchema,
        response: {
          200: genericOkResponseSchema,
          400: errorResponseSchema,
          429: errorResponseSchema,
        },
      },
    },
    async (request: any) => {
      await requestPasswordReset(request.body.email, ctxOf(request));
      return { data: { ok: true } };
    },
  );

  app.post(
    '/auth/reset-password',
    {
      config: { rateLimit: authRateLimitConfig },
      schema: {
        tags: ['auth'],
        summary: 'Concluir recuperação de senha',
        description: 'Token de uso único com TTL de 30 min (NF-S11). Revoga todas as sessões ativas.',
        body: resetPasswordBodySchema,
        response: {
          200: genericOkResponseSchema,
          400: errorResponseSchema,
          429: errorResponseSchema,
        },
      },
    },
    async (request: any) => {
      await resetPassword(request.body.token, request.body.password, ctxOf(request));
      return { data: { ok: true } };
    },
  );
};