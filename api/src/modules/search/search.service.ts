/**
 * Serviço de busca, match e denúncia (Dev 2 — PRD F2.1..F2.7).
 *
 * ── Algoritmo de score (§3.2 do PRD, determinístico e explicável) ──────────
 * ```text
 * score = 40% skillMatch + 20% rating + 15% mutualInterest
 *       + 15% availabilityOverlap + 10% activityRecency
 * ```
 * Todos os pesos vivem em `MATCHING_WEIGHTS` (configuração, sem deploy — PRD §3.2).
 * Cada componente é normalizado em `0..1`, então o score final também é `0..1`.
 *
 * BR-508 — perfis com rating < 3 têm a visibilidade reduzida em até 60%:
 * o score é multiplicado por `LOW_RATING_VISIBILITY_FACTOR`.
 *
 * BR-204 — só há match com interesse mútuo real (ensina ↔ quer aprender).
 */
import { db } from '../../db/client.js';
import { MATCHING_WEIGHTS } from '../../config/constants.js';
import { DAY_MS } from '../../shared/datetime.js';
import { writeAudit, type RequestContext } from '../../shared/audit.js';
import { badRequest } from '../../shared/errors.js';
import { reports, type ReportStatus } from '../../db/schema/index.js';
import {
  countTeachers,
  findAvailabilityFor,
  findCategoryNames,
  findLearnSkillsFor,
  findMutualInterestCandidates,
  findTeachSkillsFor,
  findTeachers,
  findUserSkillIds,
  findUsersByIds,
  type TeacherFilters,
  type TeacherRow,
} from './search.repository.js';

/** BR-508 — penalidade de visibilidade para rating abaixo de 3. */
const LOW_RATING_THRESHOLD = 3;
const LOW_RATING_VISIBILITY_FACTOR = 0.4;

/** PRD §3.2 — "última sessão em até 30 dias" satura o peso de recência. */
const ACTIVITY_WINDOW_DAYS = 30;

export type SortOption = 'relevance' | 'rating' | 'sessions' | 'recent';

export interface SearchResult {
  data: {
    id: string;
    name: string;
    avatar_url: string | null;
    bio: string | null;
    city: string | null;
    timezone: string;
    rating_avg: number | null;
    sessions_as_teacher: number;
    reviews_total: number;
    teaches: {
      category_id: string;
      category_name: string;
      category_slug: string;
      level: 'beginner' | 'intermediate' | 'advanced' | null;
      description: string | null;
    }[];
    is_reliable_teacher: boolean;
    score: number;
    /** Componentes do score — úteis para depuração e para o app explicar o ranking. */
    score_breakdown: {
      skill_match: number;
      rating: number;
      mutual_interest: number;
      availability_overlap: number;
      activity_recency: number;
    };
    /** Categorias compartilhadas com quem busca (BR-204) — pode ser vazio em busca livre. */
    shared_categories: string[];
    /** Primeiro slot livre na agenda — atalho para o card "Solicitar sessão" (F2.6). */
    next_available_at: string | null;
  }[];
  meta: {
    total: number;
    limit: number;
    sort: SortOption;
  };
}

/**
 * F2.2/F2.3/F2.4 — busca de instrutores.
 *
 * O filtro (SQL) e o score (memória) são separados de propósito: o filtro é indexável,
 * enquanto o score precisa cruzar `user_skills` e `availability_slots` do usuário que
 * está buscando. O limite de candidatos pré-score é `SCORE_POOL_SIZE`.
 */
const SCORE_POOL_SIZE = 200;

export async function searchTeachers(
  viewerId: string,
  filters: Omit<TeacherFilters, 'limit'>,
  opts: { limit: number; sort: SortOption },
): Promise<SearchResult> {
  // Traz um pool maior que o `limit` para que o score consiga reordenar.
  const pool = await findTeachers({ ...filters, limit: SCORE_POOL_SIZE }, viewerId);
  const total = await countTeachers(filters, viewerId);

  const scored = await scoreCandidates(viewerId, pool);
  const sorted = sortCandidates(scored, opts.sort);
  const page = sorted.slice(0, opts.limit);

  return {
    data: page,
    meta: { total, limit: opts.limit, sort: opts.sort },
  };
}

// ─────────────────────────────────────────────────────────────────────────
// Scoring
// ─────────────────────────────────────────────────────────────────────────

/** Aplica o score do PRD a um conjunto de candidatos. */
async function scoreCandidates(viewerId: string, pool: TeacherRow[]): Promise<SearchResult['data']> {
  if (pool.length === 0) return [];

  const viewerSkills = await findUserSkillIds(viewerId);
  const ids = pool.map((p) => p.id);
  const [teachSkills, learnSkills, availability, users] = await Promise.all([
    findTeachSkillsFor(ids),
    findLearnSkillsFor(ids),
    findAvailabilityFor(ids),
    findUsersByIds(ids),
  ]);
  const userById = new Map(users.map((u) => [u.id, u]));

  const teachByUser = groupBy(teachSkills, (s) => s.userId);
  const learnByUser = groupBy(learnSkills, (s) => s.userId);
  const availabilityByUser = groupBy(availability, (a) => a.userId);
  const now = Date.now();

  // Categorias que o viewer quer aprender (chave do `skillMatch`).
  const viewerWantsToLearn = new Set(viewerSkills.learn);
  // Categorias que o viewer ensina (chave do `mutualInterest` no sentido inverso).
  const viewerTeaches = new Set(viewerSkills.teach);

  return pool.map((teacher) => {
    const teaches = teachByUser.get(teacher.id) ?? [];
    const learns = learnByUser.get(teacher.id) ?? [];
    const teachCategoryIds = teaches.map((s) => s.categoryId);

    // 40% — interseção entre o que o viewer quer aprender e o que o instrutor ensina.
    const sharedTeach = teachCategoryIds.filter((c) => viewerWantsToLearn.has(c));
    const skillMatch = ratio(sharedTeach.length, Math.max(viewerWantsToLearn.size, 1));

    // 20% — rating normalizado 0–5 (cache já ponderado por recência — BR-506).
    const rating = clamp01(Number(teacher.ratingAvg ?? 0) / 5);

    // 15% — interesse mútuo nos dois sentidos (BR-204): ele ensina o que eu quero
    // aprender **e/ou** ele quer aprender o que eu ensino.
    const sharedLearn = learns.map((s) => s.categoryId).filter((c) => viewerTeaches.has(c));
    const mutualInterest = clamp01((sharedTeach.length + sharedLearn.length) / 2);

    // 15% — existe disponibilidade declarada (a sobreposição fina de janelas é o v2 do PRD).
    const availabilityOverlap = (availabilityByUser.get(teacher.id)?.length ?? 0) > 0 ? 1 : 0;

    // 10% — recência de atividade (satura em `ACTIVITY_WINDOW_DAYS`).
    const activityRecency = activityRecencyOf(
      userById.get(teacher.id)?.lastActivityAt ?? teacher.lastActivityAt,
      now,
    );

    let score =
      MATCHING_WEIGHTS.skillMatch * skillMatch +
      MATCHING_WEIGHTS.rating * rating +
      MATCHING_WEIGHTS.mutualInterest * mutualInterest +
      MATCHING_WEIGHTS.availabilityOverlap * availabilityOverlap +
      MATCHING_WEIGHTS.activityRecency * activityRecency;

    // BR-508 — rating < 3 reduz a visibilidade em até 60%.
    if (Number(teacher.ratingAvg ?? 0) > 0 && Number(teacher.ratingAvg) < LOW_RATING_THRESHOLD) {
      score *= LOW_RATING_VISIBILITY_FACTOR;
    }

    const sharedNames = new Set<string>();
    for (const id of sharedTeach) {
      const found = teaches.find((t) => t.categoryId === id);
      if (found) sharedNames.add(found.categoryName);
    }

    return {
      id: teacher.id,
      name: teacher.name,
      avatar_url: teacher.avatarUrl,
      bio: teacher.bio,
      city: teacher.city,
      timezone: teacher.timezone,
      rating_avg: teacher.ratingAvg === null ? null : Number(teacher.ratingAvg),
      sessions_as_teacher: teacher.sessionsAsTeacher,
      reviews_total: teacher.reviewsTotal,
      teaches: teaches.map((s) => ({
        category_id: s.categoryId,
        category_name: s.categoryName,
        category_slug: s.categorySlug,
        level: s.level,
        description: s.description,
      })),
      is_reliable_teacher: isReliable(teacher.sessionsAsTeacher, teacher.ratingAvg),
      score: round4(score),
      score_breakdown: {
        skill_match: round4(skillMatch),
        rating: round4(rating),
        mutual_interest: round4(mutualInterest),
        availability_overlap: round4(availabilityOverlap),
        activity_recency: round4(activityRecency),
      },
      // Categorias que este candidato compartilha comigo, em qualquer sentido.
      shared_categories: [...sharedNames],
      // O primeiro horário livre vem de `GET /v1/users/:id/slots` (evita N+1 aqui).
      next_available_at: null,
    };
  });
}

/**
 * F2.5 / BR-204 — sugestões por interesse mútuo (`GET /v1/me/matches`).
 *
 * A lista é ordenada pelo score de reciprocidade (categorias compartilhadas nos dois
 * sentidos) e, em empate, pelo rating.
 */
export async function getMatches(viewerId: string, limit: number): Promise<SearchResult> {
  const candidates = await findMutualInterestCandidates(viewerId, limit * 2);
  if (candidates.length === 0) return { data: [], meta: { total: 0, limit, sort: 'relevance' } };

  const ids = candidates.map((c) => c.userId);
  const [users, teachSkills] = await Promise.all([findUsersByIds(ids), findTeachSkillsFor(ids)]);

  const teachByUser = groupBy(teachSkills, (s) => s.userId);
  const sharedNames = await findCategoryNames([
    ...new Set(candidates.flatMap((c) => [...c.sharedTeach, ...c.sharedLearn])),
  ]);

  const data = candidates.map((candidate) => {
    const user = users.find((u) => u.id === candidate.userId);
    const teaches = teachByUser.get(candidate.userId) ?? [];
    // Ele ensina o que eu quero aprender.
    const teachNames = candidate.sharedTeach.map((c) => sharedNames.get(c) ?? c);
    // Ele quer aprender o que eu ensino.
    const learnNames = candidate.sharedLearn.map((c) => sharedNames.get(c) ?? c);

    const skillMatch = ratio(candidate.sharedTeach.length, Math.max(teaches.length, 1));
    const mutualInterest = clamp01((candidate.sharedTeach.length + candidate.sharedLearn.length) / 2);
    const rating = clamp01(Number(user?.ratingAvg ?? 0) / 5);

    const score =
      MATCHING_WEIGHTS.skillMatch * skillMatch +
      MATCHING_WEIGHTS.rating * rating +
      MATCHING_WEIGHTS.mutualInterest * mutualInterest;

    return {
      id: candidate.userId,
      name: user?.name ?? 'Usuário',
      avatar_url: user?.avatarUrl ?? null,
      bio: null,
      city: user?.city ?? null,
      timezone: user?.timezone ?? 'America/Sao_Paulo',
      rating_avg: user?.ratingAvg === null || user?.ratingAvg === undefined ? null : Number(user.ratingAvg),
      sessions_as_teacher: user?.sessionsAsTeacher ?? 0,
      reviews_total: user?.reviewsTotal ?? 0,
      teaches: teaches.map((s) => ({
        category_id: s.categoryId,
        category_name: s.categoryName,
        category_slug: s.categorySlug,
        level: s.level,
        description: s.description,
      })),
      is_reliable_teacher: isReliable(user?.sessionsAsTeacher ?? 0, user?.ratingAvg ?? null),
      score: round4(score),
      score_breakdown: {
        skill_match: round4(skillMatch),
        rating: round4(rating),
        mutual_interest: round4(mutualInterest),
        availability_overlap: 0,
        activity_recency: 0,
      },
      shared_categories: [...teachNames, ...learnNames],
      next_available_at: null,
    };
  });

  data.sort((a, b) => b.score - a.score || b.shared_categories.length - a.shared_categories.length);

  return {
    data: data.slice(0, limit),
    meta: { total: data.length, limit, sort: 'relevance' },
  };
}

/** F2.7 — denúncia de perfil/abuso (`POST /v1/reports`). */
export async function reportContent(
  reporterId: string,
  input: { target_user_id?: string; booking_id?: string; reason: string },
  ctx: RequestContext,
): Promise<{ id: string; status: ReportStatus }> {
  if (!input.target_user_id && !input.booking_id) {
    throw badRequest('Informe `target_user_id` ou `booking_id` para registrar a denúncia.');
  }
  if (input.target_user_id === reporterId) {
    throw badRequest('Não é possível denunciar o próprio perfil.');
  }

  const [row] = await db
    .insert(reports)
    .values({
      reporterId,
      targetUserId: input.target_user_id ?? null,
      bookingId: input.booking_id ?? null,
      reason: input.reason,
    })
    .returning({ id: reports.id, status: reports.status });

  // BR-704 — sinalizações de um mesmo alvo em 24 h alimentam a revisão manual.
  await writeAudit(db, {
    actorId: reporterId,
    action: 'moderation.report_created',
    entity: 'report',
    entityId: row.id,
    payload: { targetUserId: input.target_user_id ?? null, bookingId: input.booking_id ?? null },
    ip: ctx.ip,
    correlationId: ctx.correlationId,
  });

  return { id: row.id, status: row.status };
}

/** Usuários com disponibilidade declarada — usado para popular o filtro do app. */
export async function usersWithAvailability(userIds: string[]): Promise<Set<string>> {
  if (userIds.length === 0) return new Set();
  const rows = await findAvailabilityFor(userIds);
  return new Set(rows.map((r) => r.userId));
}

// ─────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────

function sortCandidates(
  candidates: SearchResult['data'],
  sort: SortOption,
): SearchResult['data'] {
  const sorted = [...candidates];
  switch (sort) {
    case 'rating':
      sorted.sort((a, b) => (b.rating_avg ?? 0) - (a.rating_avg ?? 0));
      break;
    case 'sessions':
      sorted.sort((a, b) => b.sessions_as_teacher - a.sessions_as_teacher);
      break;
    case 'recent':
      sorted.sort((a, b) => a.score - b.score);
      break;
    case 'relevance':
    default:
      sorted.sort((a, b) => b.score - a.score);
  }
  return sorted;
}

function groupBy<T, K extends string>(items: T[], key: (item: T) => K): Map<K, T[]> {
  const map = new Map<K, T[]>();
  for (const item of items) {
    const k = key(item);
    const bucket = map.get(k);
    if (bucket) bucket.push(item);
    else map.set(k, [item]);
  }
  return map;
}

function ratio(part: number, whole: number): number {
  if (whole <= 0) return 0;
  return clamp01(part / whole);
}

function clamp01(value: number): number {
  if (Number.isNaN(value)) return 0;
  return Math.min(1, Math.max(0, value));
}

function round4(value: number): number {
  return Math.round(value * 10_000) / 10_000;
}

/** Recência de atividade: 1.0 quando ativo hoje, decaindo até 0 em `ACTIVITY_WINDOW_DAYS`. */
function activityRecencyOf(lastActivityAt: Date | null, nowMs: number): number {
  if (!lastActivityAt) return 0;
  const days = (nowMs - lastActivityAt.getTime()) / DAY_MS;
  if (days <= 0) return 1;
  if (days >= ACTIVITY_WINDOW_DAYS) return 0;
  return clamp01(1 - days / ACTIVITY_WINDOW_DAYS);
}

/** F5.7 — badge de instrutor confiável. */
function isReliable(sessions: number, ratingAvg: string | null): boolean {
  return sessions >= 5 && Number(ratingAvg ?? 0) >= 4.5;
}