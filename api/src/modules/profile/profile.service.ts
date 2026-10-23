/**
 * Serviço de perfil e onboarding (Dev 1 — F1.5..F1.10).
 *
 * Regras aplicadas:
 *  - BR-003: `onboarding_completed_at` só é preenchido ao concluir os 4 passos;
 *  - BR-004: para ser encontrado é preciso ≥ 1 habilidade `teach` **e** disponibilidade;
 *  - BR-101: o bônus de +120 min é creditado **na mesma transação** que conclui o onboarding;
 *  - BR-202/BR-203: nível obrigatório em `teach`, limite de 10 habilidades por modo;
 *  - BR-701: o `user_id` vem sempre do JWT.
 */
import { eq, inArray } from 'drizzle-orm';

import { db } from '../../db/client.js';
import { BR } from '../../config/constants.js';
import { categories, userSkills } from '../../db/schema/index.js';
import type { Tx } from '../../db/client.js';
import { badRequest, conflict, notFound } from '../../shared/errors.js';
import { writeAudit, type RequestContext } from '../../shared/audit.js';
import { creditWelcomeBonus } from '../wallet/wallet.service.js';
import { getBalance } from '../wallet/wallet.repository.js';
import {
  countSkills,
  deleteSkill,
  exportUserData,
  findCategoryById,
  findPublicProfile,
  isBlockedBetween,
  listAvailability,
  listUserSkills,
  loadActiveUser,
  markOnboardingCompleted,
  replaceAvailability,
  softDeleteUser,
  updateUserById,
} from './profile.repository.js';

export interface TeachSkillInput {
  category_id: string;
  level: 'beginner' | 'intermediate' | 'advanced';
  description?: string;
}

export interface LearnSkillInput {
  category_id: string;
  priority?: number;
  description?: string;
}

export interface AvailabilityInput {
  weekday: number;
  start_time: string;
  end_time: string;
}

type SkillValues = {
  userId: string;
  categoryId: string;
  mode: 'teach' | 'learn';
  level: 'beginner' | 'intermediate' | 'advanced' | null;
  priority?: number;
  description: string | null;
};

// ─────────────────────────────────────────────────────────────────────────
// F1.5 — Onboarding
// ─────────────────────────────────────────────────────────────────────────

/**
 * Conclui o onboarding em **uma transação**: perfil + habilidades + disponibilidade +
 * marca de onboarding + bônus de boas-vindas. Ou acontece tudo, ou nada.
 */
export async function completeOnboarding(
  userId: string,
  input: {
    city: string;
    timezone: string;
    teaches: TeachSkillInput[];
    learns: LearnSkillInput[];
    availability: AvailabilityInput[];
    marketing_consent?: boolean;
  },
  ctx: RequestContext,
) {
  assertSkillLimits(input.teaches.length, input.learns.length);
  await assertCategoriesExist([
    ...input.teaches.map((s) => s.category_id),
    ...input.learns.map((s) => s.category_id),
  ]);

  const now = new Date();
  return db.transaction(async (tx) => {
    await updateUserById(
      userId,
      {
        city: input.city,
        timezone: input.timezone,
        ...(input.marketing_consent === undefined
          ? {}
          : { marketingConsentAt: input.marketing_consent ? now : null }),
      },
      tx,
    );

    // O wizard substitui as listas declaradas (idempotente entre reenvios).
    await tx.delete(userSkills).where(eq(userSkills.userId, userId));

    for (const teach of input.teaches) {
      await insertSkillWith(tx, {
        userId,
        categoryId: teach.category_id,
        mode: 'teach',
        level: teach.level, // BR-202 — obrigatório
        description: teach.description ?? null,
      });
    }
    for (const learn of input.learns) {
      await insertSkillWith(tx, {
        userId,
        categoryId: learn.category_id,
        mode: 'learn',
        level: null,
        priority: learn.priority ?? 3,
        description: learn.description ?? null,
      });
    }

    await replaceAvailability(userId, toSlots(userId, input.availability), tx);
    await markOnboardingCompleted(userId, tx);

    // BR-101 — bônus creditado junto com a conclusão do onboarding.
    const bonus = await creditWelcomeBonus(userId, ctx, tx);
    await writeAudit(tx, {
      actorId: userId,
      action: 'profile.onboarding_completed',
      entity: 'user',
      entityId: userId,
      payload: {
        teaches: input.teaches.length,
        learns: input.learns.length,
        availability: input.availability.length,
        welcome_bonus: bonus?.minutes ?? 0,
      },
      ip: ctx.ip,
      correlationId: ctx.correlationId,
    });

    const balance = await getBalance(tx, userId);
    return {
      onboardingCompletedAt: now,
      welcomeBonusMinutes: bonus?.minutes ?? 0,
      balance,
    };
  });
}

// ─────────────────────────────────────────────────────────────────────────
// F1.7 / F1.8 — Habilidades
// ─────────────────────────────────────────────────────────────────────────

export async function addTeachSkill(userId: string, input: TeachSkillInput, ctx: RequestContext) {
  const current = await countSkills(userId, 'teach');
  if (current >= BR.MAX_SKILLS_PER_MODE) {
    throw badRequest(`Máximo de ${BR.MAX_SKILLS_PER_MODE} habilidades ensinadas (BR-203).`);
  }
  await assertCategoriesExist([input.category_id]);

  return withDuplicateSkillGuard(async (tx) => {
    const row = await insertSkillWith(tx, {
      userId,
      categoryId: input.category_id,
      mode: 'teach',
      level: input.level, // BR-202
      description: input.description ?? null,
    });
    await writeAudit(tx, {
      actorId: userId,
      action: 'profile.teach_skill_added',
      entity: 'user_skill',
      entityId: row.id,
      ip: ctx.ip,
      correlationId: ctx.correlationId,
    });
    return withCategory(row);
  });
}

export async function addLearnSkill(userId: string, input: LearnSkillInput, ctx: RequestContext) {
  const current = await countSkills(userId, 'learn');
  if (current >= BR.MAX_SKILLS_PER_MODE) {
    throw badRequest(`Máximo de ${BR.MAX_SKILLS_PER_MODE} habilidades a aprender (BR-203).`);
  }
  await assertCategoriesExist([input.category_id]);

  return withDuplicateSkillGuard(async (tx) => {
    const row = await insertSkillWith(tx, {
      userId,
      categoryId: input.category_id,
      mode: 'learn',
      level: null,
      priority: input.priority ?? 3,
      description: learnDescription(input),
    });
    await writeAudit(tx, {
      actorId: userId,
      action: 'profile.learn_skill_added',
      entity: 'user_skill',
      entityId: row.id,
      ip: ctx.ip,
      correlationId: ctx.correlationId,
    });
    return withCategory(row);
  });
}

export async function removeSkill(
  userId: string,
  skillId: string,
  mode: 'teach' | 'learn',
  ctx: RequestContext,
): Promise<void> {
  const removed = await deleteSkill(skillId, userId, mode);
  if (!removed) throw notFound('Habilidade');
  await writeAudit(db, {
    actorId: userId,
    action: 'profile.skill_removed',
    entity: 'user_skill',
    entityId: skillId,
    payload: { mode },
    ip: ctx.ip,
    correlationId: ctx.correlationId,
  });
}

export function listSkills(userId: string, mode: 'teach' | 'learn') {
  return listUserSkills(userId, mode);
}

// ─────────────────────────────────────────────────────────────────────────
// F1.9 — Disponibilidade
// ─────────────────────────────────────────────────────────────────────────

export async function setAvailability(
  userId: string,
  slots: AvailabilityInput[],
  timezone: string | undefined,
  ctx: RequestContext,
): Promise<void> {
  await db.transaction(async (tx) => {
    if (timezone) await updateUserById(userId, { timezone }, tx);
    await replaceAvailability(userId, toSlots(userId, slots), tx);
    await writeAudit(tx, {
      actorId: userId,
      action: 'profile.availability_replaced',
      entity: 'user',
      entityId: userId,
      payload: { slots: slots.length },
      ip: ctx.ip,
      correlationId: ctx.correlationId,
    });
  });
}

export async function getAvailability(userId: string) {
  const user = await loadActiveUser(userId);
  if (!user) throw notFound('Usuário');
  return { timezone: user.timezone, slots: await listAvailability(userId) };
}

// ─────────────────────────────────────────────────────────────────────────
// F1.6 / F1.10 — Perfil e exclusão
// ─────────────────────────────────────────────────────────────────────────

/**
 * Perfil público. `viewerId` permite sinalizar bloqueio sem vazar PII (BR-702/BR-706).
 */
export async function getPublicProfile(userId: string, viewerId: string) {
  const profile = await findPublicProfile(userId);
  if (!profile) throw notFound('Usuário');
  const blockedByViewer = viewerId !== userId ? await isBlockedBetween(viewerId, userId) : false;
  return { ...profile, blockedByViewer };
}

/** F1.6 — `PATCH /v1/me`. */
export async function updateMe(userId: string, patch: Record<string, unknown>, ctx: RequestContext) {
  const data: Parameters<typeof updateUserById>[1] = {};
  if (typeof patch.name === 'string') data.name = patch.name;
  if (typeof patch.avatar_url === 'string') data.avatarUrl = patch.avatar_url;
  if (typeof patch.bio === 'string') data.bio = patch.bio;
  if (typeof patch.city === 'string') data.city = patch.city;
  if (typeof patch.timezone === 'string') data.timezone = patch.timezone;
  if (typeof patch.marketing_consent === 'boolean') {
    data.marketingConsentAt = patch.marketing_consent ? new Date() : null;
  }

  const updated = await updateUserById(userId, data);
  if (!updated) throw notFound('Usuário');
  await writeAudit(db, {
    actorId: userId,
    action: 'profile.updated',
    entity: 'user',
    entityId: userId,
    payload: { fields: Object.keys(data) },
    ip: ctx.ip,
    correlationId: ctx.correlationId,
  });
  return updated;
}

/** F1.10 — soft delete + revogação das sessões (BR-007). */
export async function deleteAccount(userId: string, reason: string | undefined, ctx: RequestContext) {
  await db.transaction(async (tx) => {
    await softDeleteUser(userId, 'account_deleted', tx);
    await writeAudit(tx, {
      actorId: userId,
      action: 'profile.account_deleted',
      entity: 'user',
      entityId: userId,
      payload: { reason: reason ?? null },
      ip: ctx.ip,
      correlationId: ctx.correlationId,
    });
  });
}

/** NF-S12 — `GET /v1/me/export` (LGPD). */
export async function exportData(userId: string) {
  const data = await exportUserData(userId);
  if (!data) throw notFound('Usuário');
  return data;
}

// ─────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────

/** BR-203 — no máximo 10 habilidades por modo. */
export function assertSkillLimits(teaches: number, learns: number): void {
  if (teaches > BR.MAX_SKILLS_PER_MODE) {
    throw badRequest(`Máximo de ${BR.MAX_SKILLS_PER_MODE} habilidades ensinadas (BR-203).`);
  }
  if (learns > BR.MAX_SKILLS_PER_MODE) {
    throw badRequest(`Máximo de ${BR.MAX_SKILLS_PER_MODE} habilidades a aprender (BR-203).`);
  }
}

/** BR-201 — catálogo fechado: toda categoria precisa existir em `categories`. */
async function assertCategoriesExist(categoryIds: string[]): Promise<void> {
  const unique = [...new Set(categoryIds)];
  if (unique.length === 0) return;
  const found = await db
    .select({ id: categories.id })
    .from(categories)
    .where(inArray(categories.id, unique));
  if (found.length !== unique.length) {
    throw badRequest('Uma ou mais categorias não existem no catálogo (BR-201).');
  }
}

function learnDescription(input: LearnSkillInput): string | null {
  return input.description ?? null;
}

function toSlots(userId: string, slots: AvailabilityInput[]) {
  return slots.map((slot) => ({
    userId,
    weekday: slot.weekday,
    startTime: slot.start_time,
    endTime: slot.end_time,
    active: true,
  }));
}

async function insertSkillWith(tx: Tx, values: SkillValues) {
  const [row] = await tx.insert(userSkills).values(values).returning();
  return row;
}

/**
 * Enriquece a skill recém-criada com `category_name`/`category_slug`.
 * A categoria já foi validada por `assertCategoriesExist`, então existe.
 */
async function withCategory<T extends { categoryId: string }>(row: T) {
  const category = await findCategoryById(row.categoryId);
  return {
    ...row,
    categoryName: category?.name ?? '',
    categorySlug: category?.slug ?? '',
  };
}

/** Traduz `23505` de `user_skills` em `409 DUPLICATE_SKILL` (PRD §8.3). */
async function withDuplicateSkillGuard<T>(fn: (tx: Tx) => Promise<T>): Promise<T> {
  try {
    return await db.transaction(fn);
  } catch (err) {
    if ((err as { code?: string }).code === '23505') {
      throw conflict('DUPLICATE_SKILL', 'Você já declara essa habilidade.');
    }
    throw err;
  }
}