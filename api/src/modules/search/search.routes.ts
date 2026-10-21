/**
 * Rotas HTTP de busca, match e denúncia (Dev 2 — PRD §8.2):
 *  - `GET  /v1/search/teachers`      → busca com filtros e ordenação (F2.2/F2.3/F2.4)
 *  - `GET  /v1/me/matches`          → sugestões por interesse mútuo (F2.5)
 *  - `GET  /v1/search/suggestions`  → autocomplete de categorias (NF-E05)
 *  - `POST /v1/reports`             → denúncia de perfil/abuso (F2.7)
 *
 * BR-701: o ator vem do JWT; nenhuma query/body aceita `user_id`.
 * BR-702: nenhuma resposta expõe e-mail/telefone.
 */
import type { FastifyPluginAsync } from 'fastify';

import { requireActiveUser, requireUserId } from '../../shared/auth/guards.js';
import { suggestCategories } from '../catalog/catalog.service.js';
import { getMatches, reportContent, searchTeachers } from './search.service.js';
import {
  createReportBodySchema,
  createReportResponseSchema,
  matchesQuerySchema,
  matchesResponseSchema,
  searchTeachersQuerySchema,
  searchTeachersResponseSchema,
  suggestionsQuerySchema,
  suggestionsResponseSchema,
} from './search.schemas.js';

export const searchRoutes: FastifyPluginAsync = async (app) => {
  // ── F2.2/F2.3/F2.4 — busca de instrutores ────────────────────────────────────
  app.get(
    '/search/teachers',
    {
      preHandler: requireActiveUser,
      schema: {
        tags: ['search'],
        summary: 'Buscar instrutores',
        description:
          'Filtros combináveis (categoria, cidade, nível mínimo, rating mínimo, dia/período de ' +
          'disponibilidade) e ordenação. `sort=relevance` aplica o score do PRD ' +
          '(40% skillMatch · 20% rating · 15% mutualInterest · 15% availabilityOverlap · 10% activityRecency).',
        querystring: searchTeachersQuerySchema,
        response: {
          200: searchTeachersResponseSchema,
          400: { $ref: 'ErrorResponse#' },
          401: { $ref: 'ErrorResponse#' },
        },
      },
    },
    async (request) => {
      const viewerId = requireUserId(request);
      const query = searchTeachersQuerySchema.parse(request.query);
      const result = await searchTeachers(
        viewerId,
        {
          categoryIds: query.skill_id,
          city: query.city,
          query: query.query,
          minLevel: query.min_level,
          minRating: query.min_rating,
          weekday: query.weekday,
          periodFrom: query.period_from,
          periodTo: query.period_to,
          limit: query.limit,
        },
        { limit: query.limit, sort: query.sort },
      );
      // `offset` é aplicado no pool já ranqueado (o score é determinístico — F2.4).
      const page = query.offset > 0 ? result.data.slice(query.offset, query.offset + query.limit) : result.data;
      return { data: page, meta: result.meta };
    },
  );

  // ── F2.5 — sugestões por interesse mútuo ─────────────────────────────────────
  app.get(
    '/me/matches',
    {
      preHandler: requireActiveUser,
      schema: {
        tags: ['search'],
        summary: 'Sugestões por interesse mútuo',
        description:
          'BR-204: só retorna perfis com reciprocidade real — ele ensina o que eu quero aprender ' +
          'e/ou ele quer aprender o que eu ensino.',
        querystring: matchesQuerySchema,
        response: {
          200: matchesResponseSchema,
          401: { $ref: 'ErrorResponse#' },
        },
      },
    },
    async (request) => {
      const query = matchesQuerySchema.parse(request.query);
      return getMatches(requireUserId(request), query.limit);
    },
  );

  // ── NF-E05 — autocomplete ────────────────────────────────────────────────────
  app.get(
    '/search/suggestions',
    {
      preHandler: requireActiveUser,
      schema: {
        tags: ['search'],
        summary: 'Autocomplete de categorias',
        description: 'Busca full-text (GIN em `categories.search_vector`, pt-BR).',
        querystring: suggestionsQuerySchema,
        response: {
          200: suggestionsResponseSchema,
          400: { $ref: 'ErrorResponse#' },
          401: { $ref: 'ErrorResponse#' },
        },
      },
    },
    async (request) => {
      const query = suggestionsQuerySchema.parse(request.query);
      const categories = await suggestCategories(query.q, query.limit);
      return {
        data: categories.map((c) => ({
          type: 'category' as const,
          id: c.id,
          label: c.name,
          slug: c.slug,
          icon: c.icon,
        })),
      };
    },
  );

  // ── F2.7 — denúncia ──────────────────────────────────────────────────────────
  app.post(
    '/reports',
    {
      preHandler: requireActiveUser,
      schema: {
        tags: ['search'],
        summary: 'Denunciar perfil ou sessão',
        description:
          'BR-704: denúncias alimentam a revisão manual. O denunciante nunca é exposto ao moderado.',
        body: createReportBodySchema,
        response: {
          201: createReportResponseSchema,
          400: { $ref: 'ErrorResponse#' },
          401: { $ref: 'ErrorResponse#' },
        },
      },
    },
    async (request, reply) => {
      const result = await reportContent(
        requireUserId(request),
        {
          target_user_id: request.body.target_user_id,
          booking_id: request.body.booking_id,
          reason: request.body.reason,
        },
        { actorId: requireUserId(request), ip: request.ip, correlationId: request.id },
      );
      reply.status(201);
      return { data: result };
    },
  );
};