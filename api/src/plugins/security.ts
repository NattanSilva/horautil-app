/**
 * Plugins de segurança e observabilidade (NF-S05..NF-S08).
 *
 * Tudo registrado no escopo raiz da aplicação, antes das rotas.
 */
import cors from '@fastify/cors';
import helmet from '@fastify/helmet';
import rateLimit from '@fastify/rate-limit';
import type { FastifyInstance } from 'fastify';

import { env } from '../config/env.js';
import { RATE_LIMIT } from '../config/constants.js';
import { env as validatedEnv } from '../config/env.js';

/** NF-S07 — headers de segurança + CSP restritiva. */
export async function registerSecurity(app: FastifyInstance): Promise<void> {
  await app.register(helmet, {
    global: true,
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        baseUri: ["'self'"],
        frameAncestors: ["'none'"],
        objectSrc: ["'none'"],
        scriptSrc: ["'self'"],
        imgSrc: ["'self'", 'data:', 'https:'],
        connectSrc: ["'self'"],
        upgradeInsecureRequests: validatedEnv.NODE_ENV === 'production' ? [] : null,
      },
    },
    // API JSON: HSTS é habilitado por padrão pelo helmet.
    hsts: validatedEnv.NODE_ENV === 'production' ? { maxAge: 31_536_000, includeSubDomains: true } : false,
    referrerPolicy: { policy: 'no-referrer' },
  });

  // NF-S08 — allowlist explícita de origens (nunca `*` com credentials).
  await app.register(cors, {
    origin: (origin, cb) => {
      // Requisições sem `Origin` (app nativo Android / curl / healthcheck) são liberadas:
      // o CORS é uma proteção de navegador, e a autenticação é via Bearer token.
      if (!origin) return cb(null, true);
      cb(null, env.CORS_ORIGINS.includes(origin));
    },
    credentials: true,
    methods: ['GET', 'HEAD', 'POST', 'PATCH', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['content-type', 'authorization', 'x-correlation-id', 'x-device-id'],
    exposedHeaders: ['x-correlation-id', 'x-ratelimit-remaining', 'retry-after'],
    maxAge: 600,
    strictPreflight: true,
  });
}

/**
 * BR-703 / NF-S06 — 100 req/min geral e 10 req/min em `/auth/*`.
 * Rotas de `/auth` sobrescrevem via `config: { rateLimit: { max, timeWindow } }`.
 */
export async function registerRateLimit(app: FastifyInstance): Promise<void> {
  await app.register(rateLimit, {
    global: true,
    max: RATE_LIMIT.GLOBAL_MAX,
    timeWindow: RATE_LIMIT.GLOBAL_WINDOW,
    // Identifica o usuário autenticado quando houver Bearer token, senão o IP.
    keyGenerator: (req) => {
      const auth = req.headers.authorization;
      if (auth?.startsWith('Bearer ')) return `u:${auth.slice(7, 27)}`;
      return `ip:${req.ip}`;
    },
    addHeaders: {
      'x-ratelimit-limit': true,
      'x-ratelimit-remaining': true,
      'x-ratelimit-reset': true,
      'retry-after': true,
    },
  });
}

/** Limite específico de autenticação — aplicado como hook em `registerAuth`. */
export const authRateLimitConfig = {
  max: RATE_LIMIT.AUTH_MAX,
  timeWindow: RATE_LIMIT.AUTH_WINDOW,
} as const;