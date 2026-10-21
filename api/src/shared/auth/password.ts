/**
 * Hash de senha — NF-S02 (argon2id) e BR-002 (mínimo 8, 1 letra + 1 número).
 *
 * argon2id é a escolha recomendada pelo PRD. Os parâmetros seguem o OWASP Password
 * Storage Cheat Sheet (m=19456 KiB ≈ 19 MiB, t=2, p=1).
 */
import { Algorithm, hash as argonHash, verify as argonVerify } from '@node-rs/argon2';

import { BR } from '../../config/constants.js';

const ARGON_OPTIONS = {
  algorithm: Algorithm.Argon2id,
  memoryCost: 19_456,
  timeCost: 2,
  parallelism: 1,
} as const;

/** Senha forte: BR-002. */
export const PASSWORD_RULES = {
  min: BR.MIN_PASSWORD_LENGTH,
  max: BR.MAX_PASSWORD_LENGTH,
} as const;

export function validatePasswordStrength(password: string): void {
  if (password.length < BR.MIN_PASSWORD_LENGTH) {
    throw new Error(`A senha deve ter no mínimo ${BR.MIN_PASSWORD_LENGTH} caracteres.`);
  }
  if (password.length > BR.MAX_PASSWORD_LENGTH) {
    throw new Error(`A senha deve ter no máximo ${BR.MAX_PASSWORD_LENGTH} caracteres.`);
  }
  if (!/[a-zA-Z]/.test(password)) {
    throw new Error('A senha deve conter ao menos uma letra.');
  }
  if (!/\d/.test(password)) {
    throw new Error('A senha deve conter ao menos um número.');
  }
}

export async function hashPassword(plain: string): Promise<string> {
  validatePasswordStrength(plain);
  return argonHash(plain, ARGON_OPTIONS);
}

export async function verifyPassword(storedHash: string, plain: string): Promise<boolean> {
  try {
    return await argonVerify(storedHash, plain);
  } catch {
    // Hash corrompido/ inválido nunca deve derrubar a request como 500.
    return false;
  }
}

/**
 * Hash descartável usado para igualar o tempo de resposta quando o e-mail não existe,
 * mitigando user enumeration no login (BR-702 em espírito).
 */
let decoyHash: Promise<string> | null = null;

export async function decoyPasswordHash(): Promise<string> {
  decoyHash ??= argonHash('horautil-decoy-placeholder', ARGON_OPTIONS);
  return decoyHash;
}

export async function burnPasswordCompare(plain: string): Promise<void> {
  await argonVerify(await decoyPasswordHash(), plain);
}