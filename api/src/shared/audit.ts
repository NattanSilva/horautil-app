/**
 * Trilha de auditoria — BR-705: "todas as operações de ledger geram log de auditoria
 * (`audit_log`) com ator, IP e payload".
 *
 * A escrita acontece **na mesma transação** da operação auditada: ou os dois
 * commits, ou nenhum.
 */
import { sql } from 'drizzle-orm';
import type { Executor } from '../db/client.js';
import { auditLog } from '../db/schema/index.js';

export interface AuditInput {
  actorId?: string | null;
  action: string;
  entity: string;
  entityId?: string | null;
  payload?: Record<string, unknown> | null;
  ip?: string | null;
  correlationId?: string | null;
}

/**
 * Contexto de auditoria extraído da request. Passado explicitamente aos serviços
 * (em vez de acoprá-los ao Fastify) para que continuem testáveis e reusáveis por jobs.
 */
export interface RequestContext {
  actorId?: string | null;
  ip?: string | null;
  correlationId?: string | null;
}

export async function writeAudit(executor: Executor, entry: AuditInput): Promise<void> {
  await executor.insert(auditLog).values({
    actorId: entry.actorId ?? null,
    action: entry.action,
    entity: entry.entity,
    entityId: entry.entityId ?? null,
    payload: entry.payload ?? sql`'{}'::jsonb`,
    ip: entry.ip ?? null,
    correlationId: entry.correlationId ?? null,
  });
}