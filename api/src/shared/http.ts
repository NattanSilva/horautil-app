/**
 * Contratos HTTP compartilhados (envelope de sucesso e *meta*).
 *
 * `data` carrega o recurso; `meta` leva informações de auditoria (NF-O05) e de
 * paginação (NF-P06).
 */
import { z } from 'zod';

/** Envelope padrão das coleções paginadas. */
export function pageSchema<T extends z.ZodTypeAny>(item: T) {
  return z.object({
    data: z.array(item),
    meta: z.object({
      pagination: z.object({
        next_cursor: z.string().nullable(),
        has_more: z.boolean(),
        limit: z.number().int(),
      }),
    }),
  });
}

/** Envelope padrão de recurso único. */
export function envelopeSchema<T extends z.ZodTypeAny>(data: T) {
  return z.object({
    data,
    meta: z.object({ correlation_id: z.string().optional() }).optional(),
  });
}

/**
 * Helper de serialização que evita repetir o envelope em todos os handlers.
 * O serializador do Fastify (Zod) garante que a resposta bate com o schema declarado.
 */
export function ok<T>(data: T) {
  return { data };
}