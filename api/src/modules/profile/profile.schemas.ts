/**
 * Schemas Zod do perfil (Dev 1 — F1.5..F1.10).
 *
 * Todos os enums vêm do schema Drizzle, garantindo que contrato HTTP e banco não divirjam
 * (ADR-003).
 */
import { z } from 'zod';

import { skillLevel, skillMode, userStatus } from '../../db/schema/index.js';
import { BR } from '../../config/constants.js';

export const skillModeSchema = z.enum(skillMode.enumValues);
export const skillLevelSchema = z.enum(skillLevel.enumValues);
export const userStatusSchema = z.enum(userStatus.enumValues);

/** F1.6 — `PATCH /v1/me`. Todos os campos opcionais (PATCH). */
export const updateMeBodySchema = z
  .object({
    name: z.string().trim().min(2).max(120).optional(),
    avatar_url: z.url('URL de avatar inválida.').max(500).optional(),
    bio: z.string().trim().max(BR.MAX_BIO_LENGTH, 'Bio muito longa.').optional(),
    city: z.string().trim().min(2).max(120).optional(),
    timezone: z.string().trim().min(3).max(60).optional(),
    marketing_consent: z.boolean().optional(),
  })
  .refine((v) => Object.keys(v).length > 0, { message: 'Envie ao menos um campo.' });

/** F1.7 — habilidade que o usuário **ensina** (nível obrigatório — BR-202). */
export const teachSkillBodySchema = z.object({
  category_id: z.uuid('Categoria inválida.'),
  level: skillLevelSchema.describe('BR-202 — obrigatório para habilidades ensinadas.'),
  description: z.string().trim().max(BR.MAX_SKILL_DESCRIPTION_LENGTH).optional(),
});

/** F1.8 — habilidade que o usuário **quer aprender** (prioridade 1 = alta). */
export const learnSkillBodySchema = z.object({
  category_id: z.uuid('Categoria inválida.'),
  priority: z.coerce.number().int().min(1).max(3).default(3),
  description: z.string().trim().max(BR.MAX_SKILL_DESCRIPTION_LENGTH).optional(),
});

/** Skill unificada (usada nas respostas). */
export const skillSchema = z.object({
  id: z.uuid(),
  category_id: z.uuid(),
  category_name: z.string(),
  category_slug: z.string(),
  mode: skillModeSchema,
  level: skillLevelSchema.nullable(),
  priority: z.number().int().nullable(),
  description: z.string().nullable(),
});

/** F1.9 — janela de disponibilidade. `weekday`: 0 = domingo … 6 = sábado. */
export const availabilityWindowSchema = z
  .object({
    weekday: z.coerce.number().int().min(0).max(6),
    start_time: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, 'Use HH:MM.'),
    end_time: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, 'Use HH:MM.'),
  })
  .refine((v) => v.end_time > v.start_time, {
    message: 'O fim deve ser posterior ao início.',
    path: ['end_time'],
  })
  .refine((v) => Number(v.start_time.slice(3)) % 30 === 0 && Number(v.end_time.slice(3)) % 30 === 0, {
    message: 'Horários devem estar alinhados à grade de 30 minutos.',
  });

/** F1.9 — `PUT /v1/me/availability` substitui toda a grade. */
export const replaceAvailabilityBodySchema = z.object({
  timezone: z.string().trim().min(3).max(60).optional(),
  slots: z.array(availabilityWindowSchema).max(40, 'Máximo de 40 janelas por semana.'),
});

export const availabilityResponseSchema = z.object({
  data: z.object({
    timezone: z.string(),
    slots: z.array(
      z.object({
        id: z.uuid(),
        weekday: z.number().int(),
        start_time: z.string(),
        end_time: z.string(),
        active: z.boolean(),
      }),
    ),
  }),
});

/** F1.5 — `PATCH /v1/me/onboarding`: os 4 passos em uma única transação. */
export const onboardingBodySchema = z.object({
  city: z.string().trim().min(2).max(120),
  timezone: z.string().trim().min(3).max(60).default('America/Sao_Paulo'),
  // Passo 2 — o que ensina (BR-004: ≥ 1 para ser encontrado).
  teaches: z.array(teachSkillBodySchema).min(1, 'Declare ao menos uma habilidade que você ensina.').max(10),
  // Passo 3 — o que quer aprender (BR-204: sem isso não há match).
  learns: z.array(learnSkillBodySchema).max(10).default([]),
  // Passo 4 — grade de disponibilidade.
  availability: z.array(availabilityWindowSchema).min(1, 'Defina ao menos uma janela.').max(40),
  marketing_consent: z.boolean().optional(),
});

export const onboardingResponseSchema = z.object({
  data: z.object({
    onboarding_completed_at: z.string(),
    welcome_bonus_minutes: z.number().int(),
    balance: z.object({
      available_minutes: z.number().int(),
      held_minutes: z.number().int(),
      total_minutes: z.number().int(),
    }),
  }),
});

/** F1.6 — perfil público (sem e-mail: BR-702). */
export const publicProfileSchema = z.object({
  id: z.uuid(),
  name: z.string(),
  avatar_url: z.string().nullable(),
  bio: z.string().nullable(),
  city: z.string().nullable(),
  timezone: z.string(),
  /** BR-506 — média ponderada por recência. */
  rating_avg: z.number().nullable(),
  sessions_as_teacher: z.number().int(),
  reviews_total: z.number().int(),
  is_reliable_teacher: z.boolean(),
  teaches: z.array(skillSchema),
  member_since: z.string(),
});

export const publicProfileResponseSchema = z.object({ data: publicProfileSchema });

export const meResponseSchema = z.object({
  data: z.object({
    id: z.uuid(),
    email: z.email(),
    name: z.string(),
    avatar_url: z.string().nullable(),
    bio: z.string().nullable(),
    city: z.string().nullable(),
    timezone: z.string(),
    status: userStatusSchema,
    onboarding_completed_at: z.string().nullable(),
    rating_avg: z.number().nullable(),
    sessions_as_teacher: z.number().int(),
    created_at: z.string(),
  }),
});

/** F1.10 — `DELETE /v1/me`. */
export const deleteMeBodySchema = z.object({
  reason: z.string().trim().min(3).max(500).optional(),
  confirm: z.literal(true, { message: 'Confirme a exclusão.' }),
});

/** F3.1 — slots livres na agenda de um instrutor. */
export const slotsQuerySchema = z
  .object({
    from: z.iso.datetime({ offset: true }).optional(),
    to: z.iso.datetime({ offset: true }).optional(),
    duration_minutes: z.coerce.number().int().min(30).max(180).default(60),
  })
  .refine((v) => !v.from || !v.to || Date.parse(v.to) > Date.parse(v.from), {
    message: '`to` deve ser maior que `from`.',
    path: ['to'],
  });