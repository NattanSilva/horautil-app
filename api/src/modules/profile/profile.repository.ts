/**
 * Repositório de `users` — módulo de perfil (Dev 1 é o owner do schema, PRD §3.3).
 *
 * BR-702: nenhuma função deste arquivo expõe `email`/`passwordHash` ao cliente;
 * a serialização pública acontece em `profile.schemas.ts`.
 */
import { and, asc, desc, eq, inArray, ne, sql } from 'drizzle-orm';
import { REVIEW } from '../../config/constants.js';
import { db, type Executor } from '../../db/client.js';
import {
  availabilitySlots,
  bookings,
  categories,
  refreshTokens,
  reviews,
  userSkills,
  users,
  walletEntries,
} from '../../db/schema/index.js';
import { toIso } from '../../shared/datetime.js';

/** BR-506 — meia-rata de recência do PRD, em meses. */
const REVIEW_DECAY_MONTHS = REVIEW.RECENCY_DECAY_MONTHS;

// ─────────────────────────────────────────────────────────────────
// Leitura
// ─────────────────────────────────────────────────────────────────

/** Colunas mínimas de `users` seguras para uso interno/guard. */
const authColumns = {
  id: users.id,
  email: users.email,
  name: users.name,
  city: users.city,
  timezone: users.timezone,
  status: users.status,
  onboardingCompletedAt: users.onboardingCompletedAt,
  suspendedUntil: users.suspendedUntil,
  ratingAvg: users.ratingAvg,
  sessionsAsTeacher: users.sessionsAsTeacher,
};

export type AuthUserRow = {
  id: string;
  email: string;
  name: string;
  city: string | null;
  timezone: string;
  status: 'active' | 'suspended' | 'deleted';
  onboardingCompletedAt: Date | null;
  suspendedUntil: Date | null;
  ratingAvg: string | null;
  sessionsAsTeacher: number;
};

/** Usuário para guard de autenticação — nunca retorna `passwordHash`. */
export async function loadActiveUser(userId: string): Promise<AuthUserRow | undefined> {
  const [row] = await db.select(authColumns).from(users).where(eq(users.id, userId)).limit(1);
  return row;
}

/** BR-403 — reativa usuário cuja suspensão expirou. */
export async function reactivateUser(userId: string, executor: Executor = db): Promise<void> {
  await executor
    .update(users)
    .set({ status: 'active', suspendedUntil: null, updatedAt: new Date() })
    .where(and(eq(users.id, userId), eq(users.status, 'suspended')));
}

export async function findUserByEmail(email: string): Promise<
  (AuthUserRow & { passwordHash: string }) | undefined
> {
  const [row] = await db
    .select({ ...authColumns, passwordHash: users.passwordHash })
    .from(users)
    .where(sql`lower(${users.email}) = lower(${email})`)
    .limit(1);
  return row;
}

export async function findUserById(userId: string): Promise<AuthUserRow | undefined> {
  return loadActiveUser(userId);
}

/** Habilidades declaradas com a categoria relacionada (evita N+1 via `db.query`). */
export async function listUserSkills(userId: string, mode: 'teach' | 'learn') {
  return db
    .select({
      id: userSkills.id,
      categoryId: userSkills.categoryId,
      categoryName: categories.name,
      categorySlug: categories.slug,
      level: userSkills.level,
      priority: userSkills.priority,
      description: userSkills.description,
    })
    .from(userSkills)
    .innerJoin(categories, eq(categories.id, userSkills.categoryId))
    .where(and(eq(userSkills.userId, userId), eq(userSkills.mode, mode)))
    .orderBy(asc(userSkills.categoryId));
}

/** BR-201 — referência de categoria (id/nome/slug) para compor as respostas. */
export async function findCategoryById(categoryId: string) {
  const [row] = await db
    .select({ id: categories.id, name: categories.name, slug: categories.slug })
    .from(categories)
    .where(eq(categories.id, categoryId))
    .limit(1);
  return row;
}

export async function countSkills(userId: string, mode: 'teach' | 'learn'): Promise<number> {
  const rows = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(userSkills)
    .where(and(eq(userSkills.userId, userId), eq(userSkills.mode, mode)));
  return rows[0]?.count ?? 0;
}

export async function findSkillById(userId: string, skillId: string, mode: 'teach' | 'learn') {
  const [row] = await db
    .select()
    .from(userSkills)
    .where(
      and(eq(userSkills.id, skillId), eq(userSkills.userId, userId), eq(userSkills.mode, mode)),
    )
    .limit(1);
  return row;
}

export async function insertSkill(values: typeof userSkills.$inferInsert) {
  const [row] = await db.insert(userSkills).values(values).returning();
  return row;
}

export async function deleteSkill(skillId: string, userId: string, mode: 'teach' | 'learn') {
  const [row] = await db
    .delete(userSkills)
    .where(
      and(eq(userSkills.id, skillId), eq(userSkills.userId, userId), eq(userSkills.mode, mode)),
    )
    .returning({ id: userSkills.id });
  return row;
}

/** F1.9 — grade semanal de disponibilidade. */
export async function listAvailability(userId: string) {
  return db
    .select()
    .from(availabilitySlots)
    .where(eq(availabilitySlots.userId, userId))
    .orderBy(asc(availabilitySlots.weekday), asc(availabilitySlots.startTime));
}

/**
 * F1.9 — substitui toda a grade. Feito em transação para nunca deixar o usuário
 * sem nenhuma janela (o que o tornaria impossível de ser encontrado — BR-004).
 */
export async function replaceAvailability(
  userId: string,
  slots: (typeof availabilitySlots.$inferInsert)[],
  executor: Executor = db,
): Promise<void> {
  await executor.delete(availabilitySlots).where(eq(availabilitySlots.userId, userId));
  if (slots.length > 0) {
    await executor.insert(availabilitySlots).values(slots);
  }
}

/**
 * Perfil público (F1.6). Retorna apenas dados públicos — BR-702 garante a ausência
 * de e-mail/telefone/senha.
 */
export async function findPublicProfile(userId: string) {
  const [user] = await db
    .select({
      id: users.id,
      name: users.name,
      avatarUrl: users.avatarUrl,
      bio: users.bio,
      city: users.city,
      timezone: users.timezone,
      ratingAvg: users.ratingAvg,
      sessionsAsTeacher: users.sessionsAsTeacher,
      noShowCount: users.noShowCount,
      onboardingCompletedAt: users.onboardingCompletedAt,
      createdAt: users.createdAt,
      lastActivityAt: users.lastActivityAt,
      status: users.status,
    })
    .from(users)
    .where(
      and(
        eq(users.id, userId),
        ne(users.status, 'deleted'),
        sql`${users.onboardingCompletedAt} IS NOT NULL`,
      ),
    )
    .limit(1);
  if (!user) return null;

  const teaches = await listUserSkills(userId, 'teach');
  const [reviewAgg] = await db
    .select({
      total: sql<number>`count(*)::int`,
      // BR-506 — média ponderada por recência: peso = 1 / (1 + meses/6)
      weightedAvg: sql<number>`COALESCE(
        SUM(${reviews.rating} * (1.0 / (1.0 + (EXTRACT(EPOCH FROM (now() - ${reviews.createdAt})) / 86400.0 / 30.0) / ${REVIEW_DECAY_MONTHS})))
        / NULLIF(SUM(1.0 / (1.0 + (EXTRACT(EPOCH FROM (now() - ${reviews.createdAt})) / 86400.0 / 30.0) / ${REVIEW_DECAY_MONTHS})), 0),
        0)::float`,
    })
    .from(reviews)
    .where(eq(reviews.revieweeId, userId));

  return {
    ...user,
    teaches,
    reviewsTotal: Number(reviewAgg?.total ?? 0),
    reviewsWeightedAvg: Number(reviewAgg?.weightedAvg ?? 0),
    // F5.7 — badge de instrutor confiável
    isReliableTeacher:
      user.sessionsAsTeacher >= REVIEW.RELIABLE_TEACHER_MIN_SESSIONS &&
      Number(user.ratingAvg ?? 0) >= REVIEW.RELIABLE_TEACHER_MIN_RATING,
  };
}

/** Todas as skills `teach` de vários usuários — usado por busca e matching. */
export async function findTeachSkillsFor(userIds: string[]) {
  if (userIds.length === 0) return [];
  return db
    .select({
      userId: userSkills.userId,
      categoryId: userSkills.categoryId,
      level: userSkills.level,
      description: userSkills.description,
      categoryName: categories.name,
      categorySlug: categories.slug,
    })
    .from(userSkills)
    .innerJoin(categories, eq(categories.id, userSkills.categoryId))
    .where(and(inArray(userSkills.userId, userIds), eq(userSkills.mode, 'teach')));
}

/** BR-706 — o usuário está bloqueado (nos dois sentidos)? */
export async function isBlockedBetween(a: string, b: string, executor: Executor = db): Promise<boolean> {
  const rows = await executor.execute<{ blocked: boolean }>(
    sql`SELECT EXISTS (
          SELECT 1 FROM user_blocks
          WHERE (blocker_id = ${a} AND blocked_id = ${b})
             OR (blocker_id = ${b} AND blocked_id = ${a})
        ) AS blocked`,
  );
  return Boolean(rows[0]?.blocked);
}

// ─────────────────────────────────────────────────────────────────
// Escrita
// ─────────────────────────────────────────────────────────────────

export async function insertUser(
  values: typeof users.$inferInsert,
  executor: Executor = db,
): Promise<typeof users.$inferSelect> {
  const [row] = await executor.insert(users).values(values).returning();
  return row;
}

export async function updateUserById(
  userId: string,
  patch: Partial<typeof users.$inferInsert>,
  executor: Executor = db,
): Promise<typeof users.$inferSelect | undefined> {
  const [row] = await executor
    .update(users)
    .set({ ...patch, updatedAt: new Date() })
    .where(eq(users.id, userId))
    .returning();
  return row;
}

/** F1.5 — conclui o onboarding (BR-003): marca o usuário como ativo para o matching. */
export async function markOnboardingCompleted(
  userId: string,
  executor: Executor = db,
): Promise<void> {
  await executor
    .update(users)
    .set({ onboardingCompletedAt: new Date(), updatedAt: new Date() })
    .where(and(eq(users.id, userId), sql`${users.onboardingCompletedAt} IS NULL`));
}

/** F3.9 / §7.4 — marca atividade para o peso `activityRecency` do matching. */
export async function touchLastActivity(userId: string, executor: Executor = db): Promise<void> {
  await executor.update(users).set({ lastActivityAt: new Date() }).where(eq(users.id, userId));
}

/** LGPD (NF-S12 / BR-007) — exportação completa dos dados do titular. */
export async function exportUserData(userId: string) {
  const [user] = await db.select().from(users).where(eq(users.id, userId)).limit(1);
  if (!user) return null;
  const [teaches, learns, availability, ledger, bookingRows, reviewRows] = await Promise.all([
    listUserSkills(userId, 'teach'),
    listUserSkills(userId, 'learn'),
    listAvailability(userId),
    db.select().from(walletEntries).where(eq(walletEntries.userId, userId)).orderBy(asc(walletEntries.createdAt)),
    db.select().from(bookings).where(sql`${bookings.teacherId} = ${userId} OR ${bookings.studentId} = ${userId}`),
    db.select().from(reviews).where(eq(reviews.reviewerId, userId)),
  ]);
  return {
    exported_at: toIso(new Date()),
    user: {
      id: user.id,
      email: user.email,
      name: user.name,
      bio: user.bio,
      city: user.city,
      timezone: user.timezone,
      status: user.status,
      created_at: toIso(user.createdAt),
      onboarding_completed_at: toIso(user.onboardingCompletedAt),
    },
    skills: { teaches, learns },
    availability,
    wallet_entries: ledger,
    bookings: bookingRows,
    reviews: reviewRows,
  };
}

/**
 * BR-007 — soft delete imediato; a anonimização (PII) é feita pelo job após 30 dias,
 * preservando os lançamentos contábeis para auditoria.
 */
export async function softDeleteUser(userId: string, reason: string, executor: Executor = db): Promise<void> {
  const now = new Date();
  await executor
    .update(users)
    .set({
      status: 'deleted',
      deletedAt: now,
      // Anonimização imediata de PII direta; o ledger permanece para auditoria.
      email: `deleted+${userId}@anonymized.horautil`,
      name: 'Usuário removido',
      avatarUrl: null,
      bio: null,
      city: null,
      updatedAt: now,
    })
    .where(eq(users.id, userId));
  // Revoga todas as sessões ativas.
  await executor
    .update(refreshTokens)
    .set({ revokedAt: now, revokedReason: reason })
    .where(and(eq(refreshTokens.userId, userId), sql`${refreshTokens.revokedAt} IS NULL`));
}

/** Contagens usadas pelos cards de busca (evita N+1). */
export async function countSessionsAsTeacher(userId: string): Promise<number> {
  const rows = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(bookings)
    .where(and(eq(bookings.teacherId, userId), eq(bookings.status, 'completed')));
  return rows[0]?.count ?? 0;
}

export const userSortColumns = {
  rating: desc(users.ratingAvg),
  sessions: desc(users.sessionsAsTeacher),
  recent: desc(users.createdAt),
} as const;