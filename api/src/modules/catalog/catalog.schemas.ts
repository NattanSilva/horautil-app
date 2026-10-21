/**
 * Schemas Zod do catálogo (`GET /v1/categories`).
 *
 * `slug` é o identificador estável usado pelo app no deep-link de filtros (BR-201).
 */
import { z } from 'zod';

export const categoryNodeSchema = z.object({
  id: z.uuid(),
  name: z.string(),
  slug: z.string(),
  icon: z.string().nullable(),
  parent_id: z.uuid().nullable(),
});

export const categoryTreeResponseSchema = z.object({
  data: z.array(categoryNodeSchema),
  meta: z.object({
    /** BR-205 — o app pode cachear a árvore por esse tempo. */
    cached_for_days: z.number().int(),
  }),
});

/** `GET /v1/categories?scope=tree|selectable`. */
export const categoriesQuerySchema = z.object({
  scope: z.enum(['tree', 'selectable']).default('tree'),
});