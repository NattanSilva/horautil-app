/**
 * Paginação por **cursor** (NF-P06 — nunca `OFFSET`).
 *
 * O cursor é opaco, base64url de `createdAt|id` (ordenação estável e determinística
 * mesmo quando várias linhas compartilham o mesmo timestamp).
 */
import { z } from 'zod';

/** Ordem estável usada por todas as listagens paginadas. */
export interface Cursor {
  /** Timestamp ISO da última linha da página anterior. */
  createdAt: string;
  /** UUID da última linha — desempate. */
  id: string;
}

export const paginationQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(100).default(20),
  cursor: z.string().min(1).optional(),
});

export type PaginationQuery = z.infer<typeof paginationQuerySchema>;

export interface Page<T> {
  data: T[];
  page_info: {
    /** `true` quando existe próxima página. */
    has_more: boolean;
    /** Cursor para a próxima requisição (presente apenas quando `has_more`). */
    next_cursor: string | null;
    limit: number;
  };
}

export function encodeCursor(cursor: Cursor): string {
  return Buffer.from(`${cursor.createdAt}|${cursor.id}`, 'utf8').toString('base64url');
}

export function decodeCursor(raw: string | undefined): Cursor | null {
  if (!raw) return null;
  try {
    const [createdAt, id] = Buffer.from(raw, 'base64url').toString('utf8').split('|');
    if (!createdAt || !id) return null;
    // Validação estrita: cursor malformado é erro do cliente, não 500.
    if (Number.isNaN(Date.parse(createdAt))) return null;
    return { createdAt, id };
  } catch {
    return null;
  }
}

/**
 * Constrói a página a partir de `limit + 1` linhas (padrão "has_more").
 */
export function buildPage<T extends { id: string; createdAt: Date | string | null }>(
  rows: T[],
  limit: number,
): Page<T> {
  const hasMore = rows.length > limit;
  const data = hasMore ? rows.slice(0, limit) : rows;
  const last = data.at(-1);
  return {
    data,
    page_info: {
      has_more: hasMore,
      next_cursor: hasMore && last ? encodeCursor({ createdAt: isoOrThrow(last.createdAt), id: last.id }) : null,
      limit,
    },
  };
}

function isoOrThrow(value: Date | string | null): string {
  if (value === null) throw new Error('Linha sem createdAt não pode gerar cursor');
  return value instanceof Date ? value.toISOString() : new Date(value).toISOString();
}