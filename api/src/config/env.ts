/**
 * Configuração de ambiente validada com Zod.
 *
 * Regras:
 *  - falha rápida no boot (fail-fast) se algo obrigatório faltar ou for inválido;
 *  - `JWT_SECRET`/`REFRESH_TOKEN_PEPPER` nunca recebem valor padrão utilizável em produção;
 *  - zero segredo no repositório (NF-S09) — tudo vem do ambiente.
 */
import 'dotenv/config';
import { z } from 'zod';

/** Segredos que não podem ser usados com valor de exemplo em produção. */
const weakSecret = z
  .string()
  .min(32, 'segredo deve ter ao menos 32 caracteres')
  .refine((v) => !/change-me|change-me-to-a-long|troque-este-valor|secret/i.test(v), {
    message: 'segredo de exemplo detectado — gere um valor aleatório real',
  });

const csv = (fallback: string[]) =>
  z
    .string()
    .optional()
    .transform((v) =>
      (v ?? '')
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean)
        .length
        ? (v ?? '')
            .split(',')
            .map((s) => s.trim())
            .filter(Boolean)
        : fallback,
    )
    .pipe(z.array(z.string().min(1)));

const envSchema = z
  .object({
    NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
    HOST: z.string().default('0.0.0.0'),
    PORT: z.coerce.number().int().min(1).max(65_535).default(3333),
    LOG_LEVEL: z.enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace', 'silent']).default('info'),

    DATABASE_URL: z.string().min(1, 'DATABASE_URL é obrigatório'),
    DB_POOL_MAX: z.coerce.number().int().min(1).max(100).default(10),

    JWT_SECRET: weakSecret,
    JWT_ACCESS_TTL: z.string().default('15m'),
    REFRESH_TOKEN_PEPPER: weakSecret,
    REFRESH_TOKEN_TTL_DAYS: z.coerce.number().int().min(1).max(365).default(30),
    PASSWORD_RESET_TTL_MINUTES: z.coerce.number().int().min(5).max(1440).default(30),

    CORS_ORIGINS: csv(['http://localhost:3000', 'http://localhost:8081']),
    REFRESH_COOKIE_NAME: z.string().default('horautil_rt'),

    INTERNAL_JOB_TOKEN: z.string().default(''),

    ENABLE_SWAGGER: z
      .enum(['true', 'false'])
      .default('true')
      .transform((v) => v === 'true'),

    SENTRY_DSN: z.string().optional().default(''),
  })
  .superRefine((cfg, ctx) => {
    // Em produção o CORS não pode continuar com as origens de desenvolvimento.
    if (cfg.NODE_ENV === 'production') {
      const dev = cfg.CORS_ORIGINS.filter((o) => o.includes('localhost') || o.includes('127.0.0.1'));
      if (dev.length > 0) {
        ctx.addIssue({
          code: 'custom',
          path: ['CORS_ORIGINS'],
          message: `CORS_ORIGINS contém origem de desenvolvimento em produção: ${dev.join(', ')}`,
        });
      }
    }
  });

export type Env = z.infer<typeof envSchema>;

function load(): Env {
  const parsed = envSchema.safeParse(process.env);
  if (!parsed.success) {
    const details = parsed.error.issues
      .map((i) => `  • ${i.path.join('.') || '(root)'}: ${i.message}`)
      .join('\n');
    throw new Error(`Configuração de ambiente inválida:\n${details}`);
  }
  return parsed.data;
}

export const env: Env = load();

export const isProd = env.NODE_ENV === 'production';
export const isTest = env.NODE_ENV === 'test';