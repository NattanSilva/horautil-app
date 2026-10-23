/**
 * Rotas HTTP de perfil (Dev 1 — PRD §8.2):
 *  - `PATCH  /v1/me`                  → atualizar perfil (F1.6)
 *  - `PATCH  /v1/me/onboarding`       → concluir onboarding (F1.5)
 *  - `GET/POST/DELETE /v1/me/teaches` → habilidades ensinadas (F1.7)
 *  - `GET/POST/DELETE /v1/me/learns`  → habilidades a aprender (F1.8)
 *  - `GET/PUT /v1/me/availability`    → grade de disponibilidade (F1.9)
 *  - `GET  /v1/me/export`             → exportação LGPD (NF-S12)
 *  - `DELETE /v1/me`                  → exclusão de conta (F1.10)
 *  - `GET  /v1/users/:id`             → perfil público (F1.6)
 *
 * BR-701: o ator vem **sempre** do JWT; nenhum body aceita `user_id`.
 */
import type { FastifyPluginAsync, FastifyRequest } from 'fastify';
import { z } from 'zod';

import { requireActiveUser, requireUserId } from '../../shared/auth/guards.js';
import { errorResponseSchema } from '../../shared/errors.js';
import {
  addLearnSkill,
  addTeachSkill,
  completeOnboarding,
  deleteAccount,
  exportData,
  getAvailability,
  getPublicProfile,
  listSkills,
  removeSkill,
  setAvailability,
  updateMe,
} from './profile.service.js';
import {
  availabilityResponseSchema,
  deleteMeBodySchema,
  learnSkillBodySchema,
  meResponseSchema,
  onboardingBodySchema,
  onboardingResponseSchema,
  publicProfileResponseSchema,
  replaceAvailabilityBodySchema,
  skillSchema,
  teachSkillBodySchema,
  updateMeBodySchema,
} from './profile.schemas.js';

const idParamsSchema = z.object({ id: z.uuid('ID inválido.') });
const skillParamsSchema = z.object({ id: z.uuid('ID inválido.') });

const skillsResponseSchema = z.object({ data: z.array(skillSchema) });
const removedResponseSchema = z.object({ data: z.object({ deleted: z.boolean() }) });

export const profileRoutes: FastifyPluginAsync = async (app) => {
  const ctxOf = (request: any) => ({
    actorId: request.user?.sub ?? request.id,
    ip: request.ip,
    correlationId: request.id,
  });

  // ── F1.5 — Onboarding ─────────────────────────────────────────────────────────
  app.patch(
    '/me/onboarding',
    {
      preHandler: requireActiveUser,
      schema: {
        tags: ['profile'],
        summary: 'Concluir onboarding (4 passos)',
        description:
          'Grava cidade/fuso, habilidades ensinadas e desejadas e a disponibilidade; marca `onboarding_completed_at` (BR-003) e credita o bônus de +120 min (BR-101) **na mesma transação**.',
        body: onboardingBodySchema,
        response: {
          200: onboardingResponseSchema,
          400: errorResponseSchema,
          401: errorResponseSchema,
        },
      },
    },
    async (request: any) => {
      const userId = requireUserId(request);
      const result = await completeOnboarding(userId, request.body as any, ctxOf(request));
      return {
        data: {
          onboarding_completed_at: result.onboardingCompletedAt.toISOString(),
          welcome_bonus_minutes: result.welcomeBonusMinutes,
          balance: {
            available_minutes: result.balance.available_minutes,
            held_minutes: result.balance.held_minutes,
            total_minutes: result.balance.total_minutes,
          },
        },
      };
    },
  );

  // ── F1.6 — `PATCH /me` ────────────────────────────────────────────────────────
  app.patch(
    '/me',
    {
      preHandler: requireActiveUser,
      schema: {
        tags: ['profile'],
        summary: 'Atualizar meu perfil',
        body: updateMeBodySchema,
        response: { 200: meResponseSchema, 400: errorResponseSchema, 401: errorResponseSchema },
      },
    },
    async (request: any) => {
      const userId = requireUserId(request);
      const user = await updateMe(userId, request.body as any, ctxOf(request));
      return {
        data: {
          id: user.id,
          email: user.email,
          name: user.name,
          avatar_url: user.avatarUrl,
          bio: user.bio,
          city: user.city,
          timezone: user.timezone,
          status: user.status,
          onboarding_completed_at: user.onboardingCompletedAt?.toISOString() ?? null,
          rating_avg: user.ratingAvg === null ? null : Number(user.ratingAvg),
          sessions_as_teacher: user.sessionsAsTeacher,
          created_at: user.createdAt.toISOString(),
        },
      };
    },
  );

  // ── F1.7 — habilidades ensinadas ──────────────────────────────────────────────
  app.get(
    '/me/teaches',
    {
      preHandler: requireActiveUser,
      schema: {
        tags: ['profile'],
        summary: 'Listar o que eu ensino',
        response: { 200: skillsResponseSchema, 401: errorResponseSchema },
      },
    },
    async (request) => {
      const rows = await listSkills(requireUserId(request), 'teach');
      return { data: rows.map(mapSkill) };
    },
  );

  app.post(
    '/me/teaches',
    {
      preHandler: requireActiveUser,
      schema: {
        tags: ['profile'],
        summary: 'Declarar habilidade que eu ensino',
        description: 'BR-202 exige nível; BR-203 limita a 10 habilidades. `409 DUPLICATE_SKILL` se já declarada.',
        body: teachSkillBodySchema,
        response: {
          201: z.object({ data: skillSchema }),
          400: errorResponseSchema,
          409: errorResponseSchema,
        },
      },
    },
    async (request: any, reply: any) => {
      const row = await addTeachSkill(requireUserId(request), request.body as any, ctxOf(request));
      reply.status(201);
      return { data: mapSkill({ ...row, mode: 'teach' }) };
    },
  );

  app.delete(
    '/me/teaches/:id',
    {
      preHandler: requireActiveUser,
      schema: {
        tags: ['profile'],
        summary: 'Remover habilidade que eu ensino',
        params: skillParamsSchema,
        response: {
          200: removedResponseSchema,
          401: errorResponseSchema,
          404: errorResponseSchema,
        },
      },
    },
    async (request) => {
      const { id } = skillParamsSchema.parse(request.params);
      await removeSkill(requireUserId(request), id, 'teach', ctxOf(request));
      return { data: { deleted: true } };
    },
  );

  // ── F1.8 — habilidades a aprender ─────────────────────────────────────────────
  app.get(
    '/me/learns',
    {
      preHandler: requireActiveUser,
      schema: {
        tags: ['profile'],
        summary: 'Listar o que quero aprender',
        response: { 200: skillsResponseSchema, 401: errorResponseSchema },
      },
    },
    async (request) => {
      const rows = await listSkills(requireUserId(request), 'learn');
      return { data: rows.map(mapSkill) };
    },
  );

  app.post(
    '/me/learns',
    {
      preHandler: requireActiveUser,
      schema: {
        tags: ['profile'],
        summary: 'Declarar habilidade que quero aprender',
        body: learnSkillBodySchema,
        response: {
          201: z.object({ data: skillSchema }),
          400: errorResponseSchema,
          409: errorResponseSchema,
        },
      },
    },
    async (request, reply) => {
      const body = learnSkillBodySchema.parse(request.body);
      const row = await addLearnSkill(requireUserId(request), body, ctxOf(request));
      reply.status(201);
      return { data: mapSkill({ ...row, mode: 'learn' }) };
    },
  );

  app.delete(
    '/me/learns/:id',
    {
      preHandler: requireActiveUser,
      schema: {
        tags: ['profile'],
        summary: 'Remover habilidade que quero aprender',
        params: skillParamsSchema,
        response: {
          200: removedResponseSchema,
          401: errorResponseSchema,
          404: errorResponseSchema,
        },
      },
    },
    async (request) => {
      const { id } = skillParamsSchema.parse(request.params);
      await removeSkill(requireUserId(request), id, 'learn', ctxOf(request));
      return { data: { deleted: true } };
    },
  );

  // ── F1.9 — disponibilidade ─────────────────────────────────────────────────────
  app.get(
    '/me/availability',
    {
      preHandler: requireActiveUser,
      schema: {
        tags: ['profile'],
        summary: 'Ler minha grade de disponibilidade',
        response: { 200: availabilityResponseSchema, 401: errorResponseSchema },
      },
    },
    async (request) => {
      const result = await getAvailability(requireUserId(request));
      return {
        data: {
          timezone: result.timezone,
          slots: result.slots.map((s) => ({
            id: s.id,
            weekday: s.weekday,
            start_time: s.startTime.slice(0, 5),
            end_time: s.endTime.slice(0, 5),
            active: s.active,
          })),
        },
      };
    },
  );

  app.put(
    '/me/availability',
    {
      preHandler: requireActiveUser,
      schema: {
        tags: ['profile'],
        summary: 'Substituir minha grade de disponibilidade',
        description: 'Substitui integralmente a grade (PUT). Horários alinhados à grade de 30 min.',
        body: replaceAvailabilityBodySchema,
        response: {
          200: availabilityResponseSchema,
          400: errorResponseSchema,
          401: errorResponseSchema,
        },
      },
    },
    async (request) => {
      const userId = requireUserId(request);
      const body = replaceAvailabilityBodySchema.parse(request.body);
      await setAvailability(userId, body.slots, body.timezone, ctxOf(request));
      const result = await getAvailability(userId);
      return {
        data: {
          timezone: result.timezone,
          slots: result.slots.map((s) => ({
            id: s.id,
            weekday: s.weekday,
            start_time: s.startTime.slice(0, 5),
            end_time: s.endTime.slice(0, 5),
            active: s.active,
          })),
        },
      };
    },
  );

  // ── NF-S12 — exportação LGPD ──────────────────────────────────────────────────
  app.get(
    '/me/export',
    {
      preHandler: requireActiveUser,
      schema: {
        tags: ['profile'],
        summary: 'Exportar meus dados (LGPD)',
        description: 'Inclui perfil, habilidades, disponibilidade, ledger, agendamentos e avaliações.',
        response: { 200: z.object({ data: z.record(z.string(), z.unknown()) }), 401: errorResponseSchema },
      },
    },
    async (request) => ({ data: await exportData(requireUserId(request)) }),
  );

  // ── F1.10 — exclusão de conta ─────────────────────────────────────────────────
  app.delete(
    '/me',
    {
      preHandler: requireActiveUser,
      schema: {
        tags: ['profile'],
        summary: 'Excluir minha conta (soft delete + LGPD)',
        description:
          'BR-007: soft delete imediato, PII anonimizada, sessões revogadas. Lançamentos contábeis são preservados para auditoria.',
        body: deleteMeBodySchema,
        response: {
          200: z.object({ data: z.object({ deleted: z.boolean(), anonymization_in_days: z.number().int() }) }),
          400: errorResponseSchema,
          401: errorResponseSchema,
        },
      },
    },
    async (request) => {
      const body = deleteMeBodySchema.parse(request.body ?? {});
      await deleteAccount(requireUserId(request), body.reason, ctxOf(request));
      return { data: { deleted: true, anonymization_in_days: 30 } };
    },
  );

  // ── F1.6 — perfil público (rota aberta; usa o JWT quando houver) ─────────────
  app.get(
    '/users/:id',
    {
      preHandler: optionalAuth,
      schema: {
        tags: ['profile'],
        summary: 'Perfil público de um usuário',
        description: 'Nunca expõe e-mail/telefone/senha (BR-702).',
        params: idParamsSchema,
        response: {
          200: publicProfileResponseSchema,
          401: errorResponseSchema,
          404: errorResponseSchema,
        },
      },
    },
    async (request) => {
      const { id } = idParamsSchema.parse(request.params);
      const viewerId = request.user?.sub ?? id;
      const profile = await getPublicProfile(id, viewerId);
      return {
        data: {
          id: profile.id,
          name: profile.name,
          avatar_url: profile.avatarUrl,
          bio: profile.bio,
          city: profile.city,
          timezone: profile.timezone,
          rating_avg: profile.ratingAvg === null ? null : Number(profile.ratingAvg),
          sessions_as_teacher: profile.sessionsAsTeacher,
          reviews_total: profile.reviewsTotal,
          is_reliable_teacher: profile.isReliableTeacher,
          teaches: profile.teaches.map((t) => ({
            id: t.id,
            category_id: t.categoryId,
            category_name: t.categoryName,
            category_slug: t.categorySlug,
            mode: 'teach' as const,
            level: t.level,
            priority: t.priority,
            description: t.description,
          })),
          member_since: profile.createdAt.toISOString(),
        },
      };
    },
  );
};

/**
 * Auth opcional: rota pública que personaliza a resposta quando há token válido.
 * Falha de verificação **não** bloqueia a rota — apenas deixa `request.user` vazio.
 */
async function optionalAuth(request: FastifyRequest): Promise<void> {
  try {
    await request.jwtVerify();
  } catch {
    request.user = undefined as unknown as FastifyRequest['user'];
  }
}

function mapSkill(row: {
  id: string;
  categoryId: string;
  categoryName: string;
  categorySlug: string;
  level: 'beginner' | 'intermediate' | 'advanced' | null;
  priority: number | null;
  description: string | null;
  mode?: 'teach' | 'learn';
}) {
  return {
    id: row.id,
    category_id: row.categoryId,
    category_name: row.categoryName,
    category_slug: row.categorySlug,
    mode: row.mode ?? 'teach',
    level: row.level,
    priority: row.priority,
    description: row.description,
  };
}