/**
 * Serviço do catálogo de categorias.
 *
 * BR-201 — catálogo fechado (fonte da verdade: `categories`).
 * BR-205 — o app cacheia a árvore por 30 dias; o serviço expõe esse TTL no payload
 *          para que o cliente controle a invalidação.
 */
import type { Category } from '../../db/schema/index.js';
import { listActiveCategories, searchCategories } from './catalog.repository.js';

/** BR-205 — TTL de cache do catálogo no app. */
export const CATEGORY_CACHE_DAYS = 30;

export interface CategoryNode {
  id: string;
  name: string;
  slug: string;
  icon: string | null;
  parent_id: string | null;
}

/**
 * Árvore de categorias (`GET /v1/categories`).
 *
 * A montagem é feita em memória a partir da lista plana: o catálogo é pequeno e fixo
 * (dezenas de linhas), então uma única query + agrupamento é mais barato que recursão.
 */
export async function getCategoryTree(): Promise<CategoryNode[]> {
  const rows = await listActiveCategories();
  const byParent = new Map<string | null, Category[]>();
  for (const row of rows) {
    const key = row.parentId ?? null;
    const bucket = byParent.get(key);
    if (bucket) bucket.push(row);
    else byParent.set(key, [row]);
  }

  const build = (parentId: string | null): CategoryNode[] =>
    (byParent.get(parentId) ?? []).map((row) => ({
      id: row.id,
      name: row.name,
      slug: row.slug,
      icon: row.icon,
      parent_id: row.parentId,
    }));

  // `listActiveCategories` já ordena por nome, preservando a ordem alfabética.
  return build(null);
}

/** Categorias "selecionáveis" (filhas) — o usuário nunca escolhe a raiz genérica. */
export async function getSelectableCategories(): Promise<CategoryNode[]> {
  const rows = await listActiveCategories();
  return rows
    .filter((row) => row.parentId !== null)
    .map((row) => ({
      id: row.id,
      name: row.name,
      slug: row.slug,
      icon: row.icon,
      parent_id: row.parentId,
    }));
}

/** NF-E05 — autocomplete por full-text (`GET /v1/search/suggestions?type=category`). */
export async function suggestCategories(term: string, limit: number): Promise<CategoryNode[]> {
  const rows = await searchCategories(term, limit);
  return rows.map((row) => ({
    id: row.id,
    name: row.name,
    slug: row.slug,
    icon: row.icon,
    parent_id: row.parentId,
  }));
}