/**
 * Repositório do catálogo de categorias (Dev 1 é o owner do schema — PRD §3.3).
 *
 * BR-201 — catálogo fechado: o usuário **escolhe** da tabela, nunca cria.
 * BR-205 — o app mobile cacheia por 30 dias; por isso a rota devolve `cached_for_days`.
 */
import { and, asc, eq, inArray, sql } from 'drizzle-orm';

import { db } from '../../db/client.js';
import { categories, type Category } from '../../db/schema/index.js';

/** Categorias ativas, ordenadas para exibição em árvore. */
export async function listActiveCategories(): Promise<Category[]> {
  return db
    .select()
    .from(categories)
    .where(eq(categories.active, true))
    .orderBy(asc(categories.name));
}

/** Categorias filhas de uma raiz — usado para montar a árvore em duas consultas. */
export async function listChildCategories(parentId: string): Promise<Category[]> {
  return db
    .select()
    .from(categories)
    .where(and(eq(categories.active, true), eq(categories.parentId, parentId)))
    .orderBy(asc(categories.name));
}

/** Categorias raiz (`parent_id IS NULL`). */
export async function listRootCategories(): Promise<Category[]> {
  return db
    .select()
    .from(categories)
    .where(sql`${eq(categories.active, true)} AND ${categories.parentId} IS NULL`)
    .orderBy(asc(categories.name));
}

/** BR-201 — categoria por id, independente de `active` (uso interno das regras). */
export async function findCategory(id: string): Promise<Category | undefined> {
  const [row] = await db.select().from(categories).where(eq(categories.id, id)).limit(1);
  return row;
}

/**
 * NF-E05 — autocomplete por full-text (GIN em `categories.search_vector`, populado
 * por trigger). `plainto_tsquery` evita que o input do usuário seja interpretado
 * como sintaxe de tsquery.
 */
export async function searchCategories(term: string, limit: number): Promise<Category[]> {
  return db
    .select()
    .from(categories)
    .where(
      sql`${categories.active} = true
          AND ${categories.searchVector} IS NOT NULL
          AND ${categories.searchVector} @@ plainto_tsquery('portuguese', ${term})
          AND ${categories.parentId} IS NOT NULL`,
    )
    .orderBy(asc(categories.name))
    .limit(limit);
}

/** Verifica se um conjunto de ids existe no catálogo — usado pelas validações de negócio. */
export async function countExistingCategories(ids: string[]): Promise<number> {
  if (ids.length === 0) return 0;
  const rows = await db
    .select({ id: categories.id })
    .from(categories)
    .where(inArray(categories.id, ids));
  return rows.length;
}

/** Categorias cujo `search_vector` está pronto para full-text (diagnóstico do índice). */
export async function countIndexedCategories(): Promise<number> {
  const rows = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(categories)
    .where(sql`${categories.searchVector} IS NOT NULL`);
  return rows[0]?.count ?? 0;
}