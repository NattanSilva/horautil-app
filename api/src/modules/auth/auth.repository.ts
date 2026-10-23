/**
 * Repositório de sessões e tokens de recuperação (Dev 1).
 *
 * NF-S01: refresh token é **opaco**, aleatório e armazenado **apenas hasheado**
 * (SHA-256 + pepper). Nunca persistimos o valor em claro.
 * NF-S11: token de reset tem TTL de 30 min e uso único (`used_at`).
 */
import { and, desc, eq, isNull, sql } from 'drizzle-orm';
import { db, type Executor } from '../../db/client.js';
import { passwordResetTokens, refreshTokens } from '../../db/schema/index.js';

export async function insertRefreshToken(
  values: typeof refreshTokens.$inferInsert,
  executor: Executor = db,
): Promise<typeof refreshTokens.$inferSelect> {
  const [row] = await executor.insert(refreshTokens).values(values).returning();
  return row;
}

export async function findRefreshTokenByHash(tokenHash: string, executor: Executor = db) {
  const [row] = await executor
    .select()
    .from(refreshTokens)
    .where(eq(refreshTokens.tokenHash, tokenHash))
    .limit(1);
  return row;
}

export async function revokeRefreshToken(
  tokenId: string,
  reason: string,
  executor: Executor = db,
): Promise<void> {
  await executor
    .update(refreshTokens)
    .set({ revokedAt: new Date(), revokedReason: reason })
    .where(and(eq(refreshTokens.id, tokenId), isNull(refreshTokens.revokedAt)));
}

/** Revoga toda a família (detectado reuso de um token já rotacionado). */
export async function revokeFamily(familyId: string, reason: string, executor: Executor = db): Promise<number> {
  const rows = await executor
    .update(refreshTokens)
    .set({ revokedAt: new Date(), revokedReason: reason })
    .where(and(eq(refreshTokens.familyId, familyId), isNull(refreshTokens.revokedAt)))
    .returning({ id: refreshTokens.id });
  return rows.length;
}

/** F1.4 — "sair de todos os dispositivos". */
export async function revokeAllForUser(userId: string, reason: string, executor: Executor = db): Promise<number> {
  const rows = await executor
    .update(refreshTokens)
    .set({ revokedAt: new Date(), revokedReason: reason })
    .where(and(eq(refreshTokens.userId, userId), isNull(refreshTokens.revokedAt)))
    .returning({ id: refreshTokens.id });
  return rows.length;
}

export async function listActiveSessions(userId: string) {
  return db
    .select({
      id: refreshTokens.id,
      deviceInfo: refreshTokens.deviceInfo,
      createdAt: refreshTokens.createdAt,
      expiresAt: refreshTokens.expiresAt,
    })
    .from(refreshTokens)
    .where(and(eq(refreshTokens.userId, userId), isNull(refreshTokens.revokedAt)))
    .orderBy(desc(refreshTokens.createdAt));
}

// ─────────────────────────────────────────────────────────────────────────
// Recuperação de senha (F1.3 / NF-S11)
// ─────────────────────────────────────────────────────────────────────────

export async function insertPasswordResetToken(
  values: typeof passwordResetTokens.$inferInsert,
  executor: Executor = db,
): Promise<typeof passwordResetTokens.$inferSelect> {
  const [row] = await executor.insert(passwordResetTokens).values(values).returning();
  return row;
}

export async function findUsablePasswordResetToken(tokenHash: string, executor: Executor = db) {
  const [row] = await executor
    .select()
    .from(passwordResetTokens)
    .where(
      and(
        eq(passwordResetTokens.tokenHash, tokenHash),
        isNull(passwordResetTokens.usedAt),
        sql`${passwordResetTokens.expiresAt} > now()`,
      ),
    )
    .limit(1);
  return row;
}

export async function markPasswordResetTokenUsed(tokenId: string, executor: Executor = db): Promise<void> {
  await executor
    .update(passwordResetTokens)
    .set({ usedAt: new Date() })
    .where(and(eq(passwordResetTokens.id, tokenId), isNull(passwordResetTokens.usedAt)));
}

/** Invalida resets pendentes antes de emitir um novo (último pedido vence). */
export async function invalidatePendingResets(userId: string, executor: Executor = db): Promise<void> {
  await executor
    .update(passwordResetTokens)
    .set({ usedAt: new Date() })
    .where(and(eq(passwordResetTokens.userId, userId), isNull(passwordResetTokens.usedAt)));
}