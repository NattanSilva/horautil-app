/**
 * Configuração do logger Pino (NF-O01 / NF-O05).
 *
 * `request.id` vira o `correlation_id` propagado para o app mobile, permitindo
 * correlacionar erro de cliente com log de servidor.
 */
import { env, isProd, isTest } from '../config/env.js';

export const loggerOptions = {
  level: isTest ? 'silent' : env.LOG_LEVEL,
  // Nunca vazar segredo/PII nos logs.
  redact: {
    paths: [
      'req.headers.authorization',
      'req.headers.cookie',
      'res.headers["set-cookie"]',
      'req.body.password',
      'req.body.token',
      'req.body.refresh_token',
      'password',
      'passwordHash',
      '*.password',
      '*.token',
    ],
    censor: '[REDACTED]',
  },
  serializers: {
    req(request: { method: string; url: string; ip: string; id: string }) {
      return { id: request.id, method: request.method, url: request.url, ip: request.ip };
    },
    res(reply: { statusCode: number }) {
      return { statusCode: reply.statusCode };
    },
  },
  base: { service: 'horautil-api', env: env.NODE_ENV },
  ...(isProd
    ? {}
    : {
        transport: {
          target: 'pino-pretty',
          options: { translateTime: 'HH:MM:ss Z', ignore: 'pid,hostname,service,env' },
        },
      }),
} as const;