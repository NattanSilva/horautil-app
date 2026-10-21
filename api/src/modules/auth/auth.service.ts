/**
 * Serviço de autenticação (Dev 1 — F1.1..F1.4).
 *
 * Decisões de segurança:
 *  - o `user_id` **nunca** vem do body (BR-701): toda escrita deriva do JWT;
 *  - e-mail normalizado para minúsculas no cadastro e na consulta (BR-001);
 *  - login responde a mesma mensagem para "e-mail inexistente" e "senha errada", com
 *    tempo de comparação equivalente (`burnPasswordCompare`) → sem user enumeration;
 *  - refresh token rotacionado a cada uso; reuso de token já rotacionado revoga a
 *    família inteira (NF-S01);
 *  - troca de senha revoga todas as sessões (F1.2).
 */
import { db } from '../../db/client.js';
import { env } from '../../config/env.js';
import {
  generateOpaqueToken,
  hashToken,
  passwordResetExpiry,
  refreshTokenExpiry,
} from '../../shared/auth/tokens.js';
import { burnPasswordCompare, hashPassword, verifyPassword } from '../../shared/auth/password.js';
import { writeAudit, type RequestContext } from '../../shared/audit.js';
import { AppError, unauthorized } from '../../shared/errors.js';
import type { Tx } from '../../db/client.js';
import {
  findUserByEmail,
  insertUser,
  loadActiveUser,
  updateUserById,
  type AuthUserRow,
} from '../profile/profile.repository.js';
import {
  findRefreshTokenByHash,
  findUsablePasswordResetToken,
  insertPasswordResetToken,
  insertRefreshToken,
  invalidatePendingResets,
  markPasswordResetTokenUsed,
  revokeAllForUser,
  revokeFamily,
  revokeRefreshToken,
} from './auth.repository.js';

/** Assinatura de access token injetada (o Fastify só decora `app.jwt`). */
export type AccessTokenSigner = (input: { userId: string; email: string }) => Promise<string>;

/** Subconjunto de `users` usado para montar a sessão. */
type SessionUser = Pick<AuthUserRow, 'id' | 'email' | 'name' | 'city' | 'timezone' | 'onboardingCompletedAt'>;

export interface SessionTokens {
  access_token: string;
  /** TTL do access token em segundos — o app usa para agendar o refresh. */
  expires_in: number;
  /** Token opaco: devolvido no body **e** em cookie HttpOnly (NF-S13). */
  refresh_token: string;
  /** `false` enquanto o onboarding (F1.5) não foi concluído. */
  onboarding_completed: boolean;
}

export interface AuthResult extends SessionTokens {
  user: {
    id: string;
    name: string;
    city: string | null;
    timezone: string;
    onboarding_completed_at: string | null;
  };
}

/** BR-001 — normalização de e-mail. */
export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

/** Converte o TTL textual do JWT (`15m`) em segundos. */
export function accessTokenTtlSeconds(): number {
  const match = /^(\d+)([smhd])?$/.exec(env.JWT_ACCESS_TTL.trim());
  if (!match) return 900;
  const factor = { s: 1, m: 60, h: 3600, d: 86_400 }[match[2] ?? 's'] as number;
  return Number(match[1]) * factor;
}

// ─────────────────────────────────────────────────────────────────────────
// F1.1 — Cadastro
// ─────────────────────────────────────────────────────────────────────────

export async function registerUser(
  input: { email: string; password: string; name: string; acceptedTerms: boolean },
  ctx: RequestContext,
  sign: AccessTokenSigner,
): Promise<AuthResult> {
  const email = normalizeEmail(input.email);
  const name = input.name.trim();

  const existing = await findUserByEmail(email);
  if (existing) throw new AppError(409, 'CONFLICT', 'E-mail já cadastrado.');

  const passwordHash = await hashOrReject(input.password);

  const user = await db.transaction(async (tx) => {
    const created = await insertUser(
      {
        email,
        passwordHash,
        name,
        // NF-S12 — consentimento explícito registrado no cadastro (BR-006).
        marketingConsentAt: input.acceptedTerms ? new Date() : null,
      },
      tx,
    );
    await writeAudit(tx, {
      actorId: created.id,
      action: 'auth.registered',
      entity: 'user',
      entityId: created.id,
      ip: ctx.ip,
      correlationId: ctx.correlationId,
      payload: { email },
    });
    return created;
  });

  return issueSession(
    {
      id: user.id,
      email: user.email,
      name: user.name,
      city: user.city,
      timezone: user.timezone,
      onboardingCompletedAt: user.onboardingCompletedAt,
    },
    sign,
    ctx,
  );
}

// ─────────────────────────────────────────────────────────────────────────
// F1.2 — Login
// ─────────────────────────────────────────────────────────────────────────

export async function loginUser(
  input: { email: string; password: string },
  ctx: RequestContext,
  sign: AccessTokenSigner,
): Promise<AuthResult> {
  const email = normalizeEmail(input.email);
  const user = await findUserByEmail(email);

  if (!user) {
    // Executa um argon2 real para não revelar se o e-mail existe (timing side-channel).
    await burnPasswordCompare(input.password);
    throw unauthorized('Credenciais inválidas.');
  }

  const passwordMatches = await verifyPassword(user.passwordHash, input.password);
  if (!passwordMatches) throw unauthorized('Credenciais inválidas.');
  if (user.status === 'deleted') throw unauthorized('Conta removida.');
  if (user.status === 'suspended') {
    throw unauthorized(
      user.suspendedUntil
        ? `Conta suspensa até ${user.suspendedUntil.toISOString()}.`
        : 'Conta suspensa.',
    );
  }

  return issueSession(
    {
      id: user.id,
      email: user.email,
      name: user.name,
      city: user.city,
      timezone: user.timezone,
      onboardingCompletedAt: user.onboardingCompletedAt,
    },
    sign,
    ctx,
  );
}

// ─────────────────────────────────────────────────────────────────────────
// F1.2 — Refresh com rotação e detecção de reuso
// ─────────────────────────────────────────────────────────────────────────

export async function refreshSession(
  rawToken: string,
  ctx: RequestContext,
  sign: AccessTokenSigner,
): Promise<AuthResult> {
  const stored = await findRefreshTokenByHash(hashToken(rawToken));
  if (!stored) throw unauthorized('Sessão inválida.');

  if (stored.revokedAt !== null) {
    // Reuso de um token já rotacionado → pode indicar roubo; derruba a família.
    if (stored.familyId) await revokeFamily(stored.familyId, 'reuse_detected', db);
    await writeAudit(db, {
      actorId: stored.userId,
      action: 'auth.refresh_reuse_detected',
      entity: 'refresh_token',
      entityId: stored.id,
      ip: ctx.ip,
      correlationId: ctx.correlationId,
    });
    throw unauthorized('Sessão inválida. Faça login novamente.');
  }

  if (stored.expiresAt.getTime() <= Date.now()) {
    throw unauthorized('Sessão expirada. Faça login novamente.');
  }

  const user = await loadActiveUser(stored.userId);
  if (!user) throw unauthorized('Usuário inexistente.');
  if (user.status === 'deleted') throw unauthorized('Conta removida.');

  return db.transaction(async (tx) => {
    await revokeRefreshToken(stored.id, 'rotated', tx);
    return issueSession(user, sign, ctx, tx, stored.familyId ?? stored.id);
  });
}

// ─────────────────────────────────────────────────────────────────────────
// F1.2 / F1.4 — Logout
// ─────────────────────────────────────────────────────────────────────────

/** Revoga apenas a sessão atual (o token presented precisa ser do usuário autenticado). */
export async function logout(
  rawToken: string | undefined,
  userId: string,
  ctx: RequestContext,
): Promise<void> {
  if (!rawToken) return;
  const stored = await findRefreshTokenByHash(hashToken(rawToken));
  if (!stored || stored.userId !== userId) return; // já revogado ou de outro usuário

  await revokeRefreshToken(stored.id, 'logout', db);
  await writeAudit(db, {
    actorId: userId,
    action: 'auth.logout',
    entity: 'refresh_token',
    entityId: stored.id,
    ip: ctx.ip,
    correlationId: ctx.correlationId,
  });
}

/** F1.4 — "sair de todos os dispositivos". */
export async function logoutAll(userId: string, ctx: RequestContext): Promise<number> {
  const revoked = await revokeAllForUser(userId, 'logout_all', db);
  await writeAudit(db, {
    actorId: userId,
    action: 'auth.logout_all',
    entity: 'user',
    entityId: userId,
    payload: { revoked },
    ip: ctx.ip,
    correlationId: ctx.correlationId,
  });
  return revoked;
}

// ─────────────────────────────────────────────────────────────────────────
// F1.3 / NF-S11 — Recuperação de senha
// ─────────────────────────────────────────────────────────────────────────

/**
 * F1.3 — sempre responde `200`, exista ou não o e-mail (evita enumeração).
 * O envio de e-mail é abstraído (§12.3): sem provedor configurado, o job de e-mail
 * apenas registra o evento; o token nunca é logado em produção.
 */
export async function requestPasswordReset(email: string, ctx: RequestContext): Promise<void> {
  const user = await findUserByEmail(normalizeEmail(email));
  if (!user || user.status === 'deleted') return;

  await db.transaction(async (tx) => {
    await invalidatePendingResets(user.id, tx);
    const raw = generateOpaqueToken(32);
    await insertPasswordResetToken(
      { userId: user.id, tokenHash: hashToken(raw), expiresAt: passwordResetExpiry() },
      tx,
    );
    await writeAudit(tx, {
      actorId: user.id,
      action: 'auth.password_reset_requested',
      entity: 'user',
      entityId: user.id,
      ip: ctx.ip,
      correlationId: ctx.correlationId,
    });
  });
}

/** NF-S11 — token de 30 min, uso único; após o uso, todas as sessões caem. */
export async function resetPassword(
  token: string,
  newPassword: string,
  ctx: RequestContext,
): Promise<void> {
  const record = await findUsablePasswordResetToken(hashToken(token));
  if (!record) throw new AppError(400, 'VALIDATION_ERROR', 'Token inválido ou expirado.');

  const passwordHash = await hashOrReject(newPassword);

  await db.transaction(async (tx) => {
    await updateUserById(record.userId, { passwordHash }, tx);
    await markPasswordResetTokenUsed(record.id, tx);
    await revokeAllForUser(record.userId, 'password_changed', tx);
    await writeAudit(tx, {
      actorId: record.userId,
      action: 'auth.password_reset_completed',
      entity: 'user',
      entityId: record.userId,
      ip: ctx.ip,
      correlationId: ctx.correlationId,
    });
  });
}

// ─────────────────────────────────────────────────────────────────────────
// Internos
// ─────────────────────────────────────────────────────────────────────────

/** BR-002 — força da senha validada com mensagem de negócio (400), não 500. */
async function hashOrReject(password: string): Promise<string> {
  try {
    return await hashPassword(password);
  } catch (err) {
    throw new AppError(400, 'VALIDATION_ERROR', (err as Error).message);
  }
}

/**
 * Cria a sessão: access token JWT (15 min) + refresh token opaco rotativo (30 dias).
 */
async function issueSession(
  user: SessionUser,
  sign: AccessTokenSigner,
  ctx?: RequestContext,
  tx: Tx | typeof db = db,
  familyId: string | null = null,
): Promise<AuthResult> {
  const rawRefresh = generateOpaqueToken(32);
  await insertRefreshToken(
    {
      userId: user.id,
      tokenHash: hashToken(rawRefresh),
      expiresAt: refreshTokenExpiry(),
      familyId,
    },
    tx,
  );
  if (ctx) {
    await writeAudit(tx, {
      actorId: user.id,
      action: 'auth.session_issued',
      entity: 'refresh_token',
      entityId: user.id,
      ip: ctx.ip,
      correlationId: ctx.correlationId,
    });
  }

  const accessToken = await sign({ userId: user.id, email: user.email });
  return {
    access_token: accessToken,
    expires_in: accessTokenTtlSeconds(),
    refresh_token: rawRefresh,
    onboarding_completed: user.onboardingCompletedAt !== null,
    user: {
      id: user.id,
      name: user.name,
      city: user.city,
      timezone: user.timezone,
      onboarding_completed_at: user.onboardingCompletedAt?.toISOString() ?? null,
    },
  };
}