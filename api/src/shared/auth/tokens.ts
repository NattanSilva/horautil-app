/**
 * Tokens opacos e hashing de segredos (NF-S01 / NF-S11).
 *
 * - **Access token**: JWT HS256, stateless, 15 min (§4.2 do PRD / NF-S01).
 * - **Refresh token**: opaco, aleatório (256 bits), 30 dias, **rotacionado a cada uso**
 *   e armazenado apenas como `SHA-256(token + pepper)`. Detecção de reuso revoga a família.
 * - **Reset de senha**: opaco, 30 min, uso único, também hasheado (NF-S11).
 */
import { createHash, randomBytes, timingSafeEqual } from 'node:crypto';

import { env } from '../../config/env.js';

/** 256 bits de entropia (NF-S01 pede mínimo 128 bits). */
export function generateOpaqueToken(bytes = 32): string {
  return randomBytes(bytes).toString('base64url');
}

/** Hash determinístico com pepper — nunca armazenar o token em claro. */
export function hashToken(token: string, pepper = env.REFRESH_TOKEN_PEPPER): string {
  return createHash('sha256').update(`${pepper}:${token}`).digest('hex');
}

/** Comparação em tempo constante (evita timing attack em busca de token). */
export function safeEqualHex(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  try {
    return timingSafeEqual(Buffer.from(a, 'hex'), Buffer.from(b, 'hex'));
  } catch {
    return false;
  }
}

export function refreshTokenExpiry(now = new Date()): Date {
  return new Date(now.getTime() + env.REFRESH_TOKEN_TTL_DAYS * 86_400_000);
}

export function passwordResetExpiry(now = new Date()): Date {
  return new Date(now.getTime() + env.PASSWORD_RESET_TTL_MINUTES * 60_000);
}

/** Opções de cookie do refresh token — NF-S13 (`Secure` + `HttpOnly` + `SameSite=Strict`). */
export function refreshCookieOptions(expiresAt: Date) {
  return {
    httpOnly: true,
    secure: env.NODE_ENV === 'production',
    sameSite: 'strict' as const,
    path: '/v1/auth',
    expires: expiresAt,
  };
}