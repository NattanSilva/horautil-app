/**
 * Repositório de busca e match (Dev 2).
 *
 * Todos os filtros combináveis (F2.3) são resolvidos em **uma** query por agregação,
 * evitando o padrão N+1 de `user_skills` → `availability_slots` → `reviews`.
 *
 * Regras aplicadas:
 *  - BR-004: só entram usuários com `onboarding_completed_at IS NOT NULL`;
 *  - BR-702: nenhum SELECT aqui toca `email`/`password_hash`;
 *  - BR-706: usuários bloqueados (nos dois sentidos) são removidos do resultado;
 *  - BR-306: os status que bloqueiam a agenda são centralizados em `BLOCKING_STATUSES`.
 */
import { and, eq, ilike, inArray, ne, sql, type SQL } from 'drizzle-orm';

import { db, type Executor } from '../../db/client.js';
import {
  availabilitySlots,
  categories,
  reviews,
  userSkills,
  users,
  type BookingStatus,
  type SkillLevel,
} from '../../db/schema/index.js';

/** Status que ocupam a agenda do instrutor (BR-306 / ADR-002). */
export const BLOCKING_STATUSES: BookingStatus[] = ['confirmed', 'awaiting_confirmation'];

export interface TeacherFilters {
  /** Categorias que o instrutor precisa ensinar (F2.2 — qualquer uma). */
  categoryIds?: string[];
  city?: string;
  /** Nome/slug da categoria — busca textual além do id. */
  query?: string;
  /** Nível mínimo do instrutor (F2.3), comparação ordinal no enum `skill_level`. */
  minLevel?: SkillLevel;
  minRating?: number;
  /** Dia da semana (0 = domingo) com disponibilidade (F2.3). */
  weekday?: number;
  /** Janela local "HH:MM" que a disponibilidade do instrutor precisa conter (F2.3). */
  periodFrom?: string;
  periodTo?: string;
  limit: number;
}

export interface TeacherRow {
  id: string;
  name: string;
  avatarUrl: string | null;
  bio: string | null;
  city: string | null;
  timezone: string;
  ratingAvg: string | null;
  sessionsAsTeacher: number;
  reviewsTotal: number;
  createdAt: Date;
  lastActivityAt: Date | null;
}

/** Escapa `%` e `_` para `ILIKE` com padrão literal. */
export function escapeLike(term: string): string {
  return term.replace(/[\\%_]/g, (m) => `\\${m}`);
}

/** Condições comuns a toda listagem de candidatos (BR-004 + BR-706). */
function baseConditions(viewerId: string): SQL[] {
  return [
    sql`${users.onboardingCompletedAt} IS NOT NULL`,
    sql`${users.status} = 'active'`,
    sql`${users.id} <> ${viewerId}`,
    sql`NOT EXISTS (
          SELECT 1 FROM user_blocks b
          WHERE (b.blocker_id = ${users.id} AND b.blocked_id = ${viewerId})
             OR (b.blocker_id = ${viewerId} AND b.blocked_id = ${users.id})
        )`,
  ];
}

/** Constrói o `WHERE` completo a partir dos filtros — compartilhado por lista e contagem. */
export function buildTeacherConditions(
  filters: Omit<TeacherFilters, 'limit'>,
  viewerId: string,
): SQL[] {
  const conditions = baseConditions(viewerId);

  if (filters.city) conditions.push(ilike(users.city, `%${escapeLike(filters.city)}%`));
  if (filters.minRating !== undefined) {
    conditions.push(sql`${users.ratingAvg} IS NOT NULL AND ${users.ratingAvg} >= ${filters.minRating}`);
  }
  if (filters.categoryIds?.length) {
    conditions.push(sql`EXISTS (
      SELECT 1 FROM user_skills us
      WHERE us.user_id = ${users.id} AND us.mode = 'teach'
        AND us.category_id = ANY(${filters.categoryIds})
    )`);
  }
  if (filters.query) {
    conditions.push(sql`EXISTS (
      SELECT 1 FROM user_skills us
      JOIN categories c ON c.id = us.category_id
      WHERE us.user_id = ${users.id} AND us.mode = 'teach'
        AND (c.name ILIKE ${`%${escapeLike(filters.query)}%`} OR c.slug = ${filters.query.toLowerCase()})
    )`);
  }
  if (filters.minLevel) {
    conditions.push(sql`EXISTS (
      SELECT 1 FROM user_skills us
      WHERE us.user_id = ${users.id} AND us.mode = 'teach'
        AND array_position(enum_range(NULL::skill_level), us.level)
            >= array_position(enum_range(NULL::skill_level), ${filters.minLevel}::skill_level)
    )`);
  }
  if (filters.weekday !== undefined) {
    conditions.push(sql`EXISTS (
      SELECT 1 FROM availability_slots a
      WHERE a.user_id = ${users.id} AND a.active = true AND a.weekday = ${filters.weekday}
    )`);
  }
  if (filters.periodFrom && filters.periodTo) {
    conditions.push(sql`EXISTS (
      SELECT 1 FROM availability_slots a
      WHERE a.user_id = ${users.id} AND a.active = true
        AND a.start_time <= ${filters.periodFrom}::time
        AND a.end_time >= ${filters.periodTo}::time
    )`);
  }

  return conditions;
}

/** Busca de instrutores com filtros combináveis (F2.2/F2.3). */
export async function findTeachers(
  filters: TeacherFilters,
  viewerId: string,
  executor: Executor = db,
): Promise<TeacherRow[]> {
  return executor
    .select({
      id: users.id,
      name: users.name,
      avatarUrl: users.avatarUrl,
      bio: users.bio,
      city: users.city,
      timezone: users.timezone,
      ratingAvg: users.ratingAvg,
      sessionsAsTeacher: users.sessionsAsTeacher,
      createdAt: users.createdAt,
      lastActivityAt: users.lastActivityAt,
      reviewsTotal: sql<number>`(
        SELECT count(*)::int FROM ${reviews} r WHERE r.reviewee_id = ${users.id}
      )`,
    })
    .from(users)
    .where(and(...buildTeacherConditions(filters, viewerId)))
    .orderBy(sql`${users.ratingAvg} DESC NULLS LAST, ${users.sessionsAsTeacher} DESC, ${users.id}`)
    .limit(filters.limit);
}

/** Total de candidatos para o mesmo filtro — alimentaria `meta.total`. */
export async function countTeachers(
  filters: Omit<TeacherFilters, 'limit'>,
  viewerId: string,
  executor: Executor = db,
): Promise<number> {
  const rows = await executor
    .select({ count: sql<number>`count(*)::int` })
    .from(users)
    .where(and(...buildTeacherConditions(filters, viewerId)));
  return Number(rows[0]?.count ?? 0);
}

/** Habilidades `teach` de vários instrutores (montagem do card — F2.6), em uma query. */
export async function findTeachSkillsFor(userIds: string[]) {
  return findSkillsFor(userIds, 'teach');
}

/**
 * Habilidades `learn` de vários usuários — necessário para calcular o outro lado do
 * interesse mútuo ("ele quer aprender o que eu ensino", BR-204).
 */
export async function findLearnSkillsFor(userIds: string[]) {
  return findSkillsFor(userIds, 'learn');
}

async function findSkillsFor(userIds: string[], mode: 'teach' | 'learn') {
  if (userIds.length === 0) return [];
  return db
    .select({
      userId: userSkills.userId,
      categoryId: userSkills.categoryId,
      categoryName: categories.name,
      categorySlug: categories.slug,
      level: userSkills.level,
      description: userSkills.description,
    })
    .from(userSkills)
    .innerJoin(categories, eq(categories.id, userSkills.categoryId))
    .where(and(inArray(userSkills.userId, userIds), eq(userSkills.mode, mode)))
    .orderBy(categories.name);
}

/** Nomes das categorias a partir de ids — usado para legendar o match (F2.5). */
export async function findCategoryNames(ids: string[]): Promise<Map<string, string>> {
  if (ids.length === 0) return new Map();
  const rows = await db
    .select({ id: categories.id, name: categories.name })
    .from(categories)
    .where(inArray(categories.id, ids));
  return new Map(rows.map((r) => [r.id, r.name]));
}

/**
 * BR-204 / F2.5 — interesse mútuo: candidatos que
 *  (a) ensinam ao menos uma categoria que o usuário **quer aprender**, ou
 *  (b) querem aprender ao menos uma categoria que o usuário **ensina**.
 */
export async function findMutualInterestCandidates(
  viewerId: string,
  limit: number,
): Promise<{ userId: string; sharedTeach: string[]; sharedLearn: string[] }[]> {
  const rows = (await db.execute(sql`
    WITH viewer AS (
      SELECT
        ARRAY(SELECT category_id FROM user_skills WHERE user_id = ${viewerId} AND mode = 'teach')  AS teach_ids,
        ARRAY(SELECT category_id FROM user_skills WHERE user_id = ${viewerId} AND mode = 'learn') AS learn_ids
    ),
    candidates AS (
      SELECT u.id AS user_id,
             ARRAY(
               SELECT us.category_id FROM user_skills us
               WHERE us.user_id = u.id AND us.mode = 'teach'
                 AND us.category_id = ANY((SELECT learn_ids FROM viewer))
             ) AS shared_teach,
             ARRAY(
               SELECT us.category_id FROM user_skills us
               WHERE us.user_id = u.id AND us.mode = 'learn'
                 AND us.category_id = ANY((SELECT teach_ids FROM viewer))
             ) AS shared_learn
      FROM users u
      WHERE u.id <> ${viewerId}
        AND u.status = 'active'
        AND u.onboarding_completed_at IS NOT NULL
        AND NOT EXISTS (
          SELECT 1 FROM user_blocks b
          WHERE (b.blocker_id = u.id AND b.blocked_id = ${viewerId})
             OR (b.blocker_id = ${viewerId} AND b.blocked_id = u.id)
        )
    )
    SELECT user_id, shared_teach, shared_learn
    FROM candidates
    WHERE cardinality(shared_teach) > 0 OR cardinality(shared_learn) > 0
    ORDER BY (cardinality(shared_teach) + cardinality(shared_learn)) DESC, user_id
    LIMIT ${limit}
  `)) as unknown as {
    user_id: string;
    shared_teach: string[];
    shared_learn: string[];
  }[];

  return rows.map((row) => ({
    userId: row.user_id,
    sharedTeach: row.shared_teach ?? [],
    sharedLearn: row.shared_learn ?? [],
  }));
}

/** Carga mínima dos candidatos do match (avatar/nome/rating) — uma query. */
export async function findUsersByIds(userIds: string[]) {
  if (userIds.length === 0) return [];
  return db
    .select({
      id: users.id,
      name: users.name,
      avatarUrl: users.avatarUrl,
      city: users.city,
      timezone: users.timezone,
      ratingAvg: users.ratingAvg,
      sessionsAsTeacher: users.sessionsAsTeacher,
      lastActivityAt: users.lastActivityAt,
      createdAt: users.createdAt,
      reviewsTotal: sql<number>`(
        SELECT count(*)::int FROM ${reviews} r WHERE r.reviewee_id = ${users.id}
      )`,
    })
    .from(users)
    .where(and(inArray(users.id, userIds), ne(users.status, 'deleted')));
}

/** Grade de disponibilidade de um conjunto de usuários (score `availabilityOverlap`). */
export async function findAvailabilityFor(userIds: string[]) {
  if (userIds.length === 0) return [];
  return db
    .select({
      userId: availabilitySlots.userId,
      weekday: availabilitySlots.weekday,
      startTime: availabilitySlots.startTime,
      endTime: availabilitySlots.endTime,
    })
    .from(availabilitySlots)
    .where(and(inArray(availabilitySlots.userId, userIds), eq(availabilitySlots.active, true)));
}

/**
 * Interesses do usuário logado — base do cálculo de `skillMatch`/`mutualInterest`.
 * Retorna os ids de categoria em cada modo.
 */
export async function findUserSkillIds(
  userId: string,
): Promise<{ teach: string[]; learn: string[] }> {
  const rows = await db
    .select({ mode: userSkills.mode, categoryId: userSkills.categoryId })
    .from(userSkills)
    .where(eq(userSkills.userId, userId));
  return {
    teach: rows.filter((r) => r.mode === 'teach').map((r) => r.categoryId),
    learn: rows.filter((r) => r.mode === 'learn').map((r) => r.categoryId),
  };
}

/** Usuários cuja disponibilidade cobre algum dos dias/janelas informados (score de overlap). */
export async function hasAvailabilityOverlap(userIds: string[]): Promise<Set<string>> {
  if (userIds.length === 0) return new Set();
  const rows = await db
    .select({ userId: availabilitySlots.userId })
    .from(availabilitySlots)
    .where(and(inArray(availabilitySlots.userId, userIds), eq(availabilitySlots.active, true)));
  return new Set(rows.map((r) => r.userId));
}