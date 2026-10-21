/**
 * Guards de autenticação/autorização.
 *
 * BR-701: **todas** as operações de escrita obtêm o `user_id` a partir do JWT,
 * nunca do body/query (por isso `requireAuth` é o único caminho para ler o ator).
 * NF-S10: checagem de ownership acontece nos serviços, comparando com `request.userId`.
 */
import type { FastifyReply, FastifyRequest } from 'fastify';

import { accountSuspended, forbidden, tokenExpired, unauthorized } from '../errors.js';
import { loadActiveUser, reactivateUser } from '../../modules/profile/profile.repository.js';

declare module '@fastify/jwt' {
  interface FastifyJWT {
    /** Payload assinado no access token. */
    payload: { sub: string; email: string; typ: 'access' };
    /** Resultado de `request.jwtVerify()`. */
    user: { sub: string; email: string; typ: 'access' };
  }
}

declare module 'fastify' {
  interface FastifyRequest {
    /**
     * Preenchido por `requireAuth` / `requireActiveUser`.
     * `undefined` em rotas públicas.
     */
    currentUser?: {
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
  }
}

/**
 * Extrai o `userId` do JWT já validado.
 * Deve ser chamado **apenas** depois de `requireAuth`.
 */
export function requireUserId(request: FastifyRequest): string {
  const userId = request.user?.sub;
  if (!userId) throw unauthorized();
  return userId;
}

/** Valida o access token (assinatura + expiração) e popula `request.user`. */
export async function requireAuth(request: FastifyRequest, _reply: FastifyReply): Promise<void> {
  try {
    await request.jwtVerify();
  } catch (err) {
    const code = (err as { code?: string }).code;
    if (code === 'FST_JWT_AUTHORIZATION_TOKEN_EXPIRED' || code === 'FAST_JWT_EXPIRED') {
      throw tokenExpired();
    }
    throw unauthorized('Token ausente ou inválido.');
  }
}

/**
 * Valida o token **e** carrega o usuário, aplicando as regras de status:
 *  - `deleted`  → 401 (conta removida, BR-007);
 *  - `suspended` com `suspendedUntil` no futuro → 403 (BR-403);
 *  - `suspended` com suspensão expirada → reativa o usuário no banco.
 *
 * Usado em toda rota de escrita, para que um usuário suspenso não consiga agendar.
 */
export async function requireActiveUser(request: FastifyRequest, reply: FastifyReply): Promise<void> {
  await requireAuth(request, reply);
  const userId = requireUserId(request);
  const user = await loadActiveUser(userId);
  if (!user) throw unauthorized('Token de usuário inexistente.');
  if (user.status === 'deleted') throw unauthorized('Conta removida.');
  if (user.status === 'suspended') {
    if (isSuspensionActive(user.suspendedUntil)) {
      throw accountSuspended(`Conta suspensa até ${user.suspendedUntil?.toISOString()}.`);
    }
    // Reativação automática (a suspensão expirou) — persistida para manter o cache de leitura coerente.
    await reactivateUser(userId);
    user.status = 'active';
  }
  request.currentUser = user;
}

/** BR-403 — suspensão ainda vigente? */
export function isSuspensionActive(suspendedUntil: Date | null, now = new Date()): boolean {
  if (!suspendedUntil) return false;
  return suspendedUntil.getTime() > now.getTime();
}

/** Utilitário para handlers que precisam do usuário autenticado e já validado. */
export function currentUser(request: FastifyRequest) {
  if (!request.currentUser) throw unauthorized();
  return request.currentUser;
}

/** Garante que o recurso pertence ao usuário autenticado (NF-S10). */
export function assertOwnership(actorId: string, ownerId: string, message?: string): void {
  if (actorId !== ownerId) throw forbidden(message ?? 'Recurso de outro usuário.');
}