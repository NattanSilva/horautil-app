/**
 * Schemas Zod de busca e match (Dev 2 — F2.2..F2.5).
 *
 * Os filtros combináveis (F2.3) chegam como query params; `skill_id` aceita repetição
 * (CSV) para permitir "quero aprender Violão **ou** Piano".
 */
import { z } from 'zod';

import { skillLevel } from '../../db/schema/index.js';

export const skillLevelSchema = z.enum(skillLevel.enumValues);

/** `"HH:MM"` — usado nos filtros de período da disponibilidade. */
export const timeOfDaySchema = z
  .string()
  .regex(/^([01]\d|2[0-3]):[0-5]\d$/, 'Use HH:MM.');

/** CSV de UUIDs → array (query string não aceita arrays). */
const csvUuids = z
  .string()
  .optional()
  .transform((v) =>
    v
      ? v
          .split(',')
          .map((s) => s.trim())
          .filter(Boolean)
      : undefined,
  )
  .pipe(z.array(z.uuid('Categoria inválida.')).max(10).optional());

/** F2.2/F2.3 — `GET /v1/search/teachers`. */
export const searchTeachersQuerySchema = z
  .object({
    /** Categorias que o instrutor precisa ensinar (qualquer uma). */
    skill_id: csvUuids,
    /** Nome ou slug da categoria — alternativa textual ao `skill_id`. */
    query: z.string().trim().min(1).max(80).optional(),
    city: z.string().trim().min(2).max(120).optional(),
    /** Nível mínimo do instrutor (`beginner|intermediate|advanced`). */
    min_level: skillLevelSchema.optional(),
    min_rating: z.coerce.number().min(0).max(5).optional(),
    /** 0 = domingo … 6 = sábado. */
    weekday: z.coerce.number().int().min(0).max(6).optional(),
    period_from: timeOfDaySchema.optional(),
    period_to: timeOfDaySchema.optional(),
    /** F2.4 — ordenação. `relevance` usa o score do PRD. */
    sort: z.enum(['relevance', 'rating', 'sessions', 'recent']).default('relevance'),
    limit: z.coerce.number().int().min(1).max(50).default(20),
    offset: z.coerce.number().int().min(0).max(1000).default(0),
  })
  .refine((v) => !(v.period_from && v.period_to) || v.period_to > v.period_from, {
    message: '`period_to` deve ser maior que `period_from`.',
    path: ['period_to'],
  });

/** Componentes do score — expostos para o app explicar o ranking (PRD §3.2). */
export const scoreBreakdownSchema = z.object({
  skill_match: z.number(),
  rating: z.number(),
  mutual_interest: z.number(),
  availability_overlap: z.number(),
  activity_recency: z.number(),
});

export const teacherSkillSchema = z.object({
  category_id: z.uuid(),
  category_name: z.string(),
  category_slug: z.string(),
  level: skillLevelSchema.nullable(),
  description: z.string().nullable(),
});

/** F2.6 — card de resultado. */
export const teacherCardSchema = z.object({
  id: z.uuid(),
  name: z.string(),
  avatar_url: z.string().nullable(),
  bio: z.string().nullable(),
  city: z.string().nullable(),
  timezone: z.string(),
  rating_avg: z.number().nullable(),
  sessions_as_teacher: z.number().int(),
  reviews_total: z.number().int(),
  teaches: z.array(teacherSkillSchema),
  is_reliable_teacher: z.boolean(),
  score: z.number(),
  score_breakdown: scoreBreakdownSchema,
  shared_categories: z.array(z.string()),
  next_available_at: z.string().nullable(),
});

export const searchTeachersResponseSchema = z.object({
  data: z.array(teacherCardSchema),
  meta: z.object({
    total: z.number().int(),
    limit: z.number().int(),
    sort: z.enum(['relevance', 'rating', 'sessions', 'recent']),
  }),
});

/** F2.5 — `GET /v1/me/matches`. */
export const matchesQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(50).default(10),
});

export const matchesResponseSchema = searchTeachersResponseSchema;

/** NF-E05 — `GET /v1/search/suggestions?type=category&q=viol`. */
export const suggestionsQuerySchema = z.object({
  type: z.enum(['category']).default('category'),
  q: z.string().trim().min(2, 'Digite ao menos 2 caracteres.').max(60),
  limit: z.coerce.number().int().min(1).max(20).default(8),
});

export const suggestionsResponseSchema = z.object({
  data: z.array(
    z.object({
      type: z.literal('category'),
      id: z.uuid(),
      label: z.string(),
      slug: z.string(),
      icon: z.string().nullable(),
    }),
  ),
});

/** F2.7 — `POST /v1/reports`. */
export const createReportBodySchema = z
  .object({
    target_user_id: z.uuid('Usuário inválido.').optional(),
    booking_id: z.uuid('Agendamento inválido.').optional(),
    reason: z.string().trim().min(10, 'Descreva o motivo (mínimo 10 caracteres).').max(1000),
  })
  .refine((v) => Boolean(v.target_user_id ?? v.booking_id), {
    message: 'Informe `target_user_id` ou `booking_id`.',
    path: ['target_user_id'],
  });

export const createReportResponseSchema = z.object({
  data: z.object({
    id: z.uuid(),
    status: z.enum(['open', 'reviewing', 'resolved', 'dismissed']),
  }),
});