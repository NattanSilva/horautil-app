/**
 * Rotas HTTP do catálogo (Dev 1 — PRD §8.2):
 *  - `GET /v1/categories` → árvore de categorias (F2.1)
 *
 * Rota **pública**: o app cacheia por 30 dias (BR-205) e o payload não contém
 * nenhum dado pessoal.
 */
import type { FastifyPluginAsync } from 'fastify';

import { CATEGORY_CACHE_DAYS, getCategoryTree, getSelectableCategories } from './catalog.service.js';
import { categoriesQuerySchema, categoryTreeResponseSchema } from './catalog.schemas.js';

export const catalogRoutes: FastifyPluginAsync = async (app) => {
  app.get(
    '/categories',
    {
      schema: {
        tags: ['catalog'],
        summary: 'Árvore de categorias',
        description:
          'Catálogo fechado de habilidades (BR-201). `scope=tree` traz apenas as raízes; ' +
          '`scope=selectable` traz as categorias elegíveis para declaração de habilidade.',
        querystring: categoriesQuerySchema,
        response: { 200: categoryTreeResponseSchema },
      },
    },
    async (request) => {
      const { scope } = categoriesQuerySchema.parse(request.query);
      const data = scope === 'selectable' ? await getSelectableCategories() : await getCategoryTree();
      return { data, meta: { cached_for_days: CATEGORY_CACHE_DAYS } };
    },
  );
};