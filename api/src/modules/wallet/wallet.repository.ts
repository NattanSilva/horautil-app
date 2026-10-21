/**
 * Repositório do ledger (`wallet_entries`) — ADR-001 / BR-108 / BR-109.
 *
 * Regras de concorrência (R1 do PRD, risco crítico):
 *  - **toda** mutação de saldo roda dentro de `db.transaction`;
 *  - a transação começa com `lockUserLedger()`, que faz `SELECT ... FROM users ... FOR UPDATE`,
 *    serializando todas as operações de saldo do mesmo usuário;
 *  - além do lock, a view `user_wallet_balance` alimenta um trigger que impede
 *    `available_minutes < 0` no próprio banco (defesa em profundidade, BR-107);
 *  - `balance_after` é gravado em cada INSERT para a trilha de auditoria (JS-05).
 */
import { and, asc, desc, eq, lt, sql, type SQL } from 'drizzle-orm';
import type { Executor } from '../../db/client.js';
import { entryStatus, users, walletEntries, type EntryType } from '../../db/schema/index.js';

/** Forma da view `user_wallet_balance` (criada em migração customizada). */
export interface BalanceRow {
  user_id: string;
  /** Saldo líquido: `available_minutes + held_minutes`. */
  total_minutes: number;
  /** Minutos reservados em sessões `pending`/`confirmed`. */
  held_minutes: number;
  /** Minutos efetivamente gastáveis agora. */
  available_minutes: number;
}

export const EMPTY_BALANCE: Omit<BalanceRow, 'user_id'> = {
  total_minutes: 0,
  held_minutes: 0,
  available_minutes: 0,
};

/**
 * Lock pessimista do ledger do usuário. Deve ser a **primeira** operação de qualquer
 * transação que altere o saldo (BR-108).
 */
export async function lockUserLedger(executor: Executor, userId: string): Promise<void> {
  await executor.execute(sql`SELECT id FROM ${users} WHERE ${users.id} = ${userId} FOR UPDATE`);
}

/**
 * `postgres-js` devolve um `RowList` sem genérico; o cast é seguro porque a query é
 * interna e a forma da linha é garantida pelo SQL acima.
 */
async function queryRows<T>(executor: Executor, statement: SQL): Promise<T[]> {
  return (await executor.execute(statement)) as unknown as T[];
}

/** Lê o saldo derivado (sem lock — apenas leitura/exibição). */
export async function getBalance(executor: Executor, userId: string): Promise<BalanceRow> {
  const rows = await queryRows<BalanceRow>(
    executor,
    sql`SELECT user_id, total_minutes, held_minutes, available_minutes
        FROM user_wallet_balance
        WHERE user_id = ${userId}`,
  );
  const row = rows[0];
  return row ?? { user_id: userId, ...EMPTY_BALANCE };
}

export interface NewLedgerEntry {
  userId: string;
  bookingId?: string | null;
  type: EntryType;
  minutes: number;
  status?: (typeof entryStatus.enumValues)[number];
  expiresAt?: Date | null;
  balanceAfter: number;
  description?: string | null;
  /** Chave de idempotência: garante que a mesma movimentação não ocorra duas vezes. */
  idempotencyKey?: string | null;
}

/** INSERT puro no ledger (append-only). */
export async function insertEntry(
  executor: Executor,
  entry: NewLedgerEntry,
): Promise<typeof walletEntries.$inferSelect> {
  const [row] = await executor
    .insert(walletEntries)
    .values({
      userId: entry.userId,
      bookingId: entry.bookingId ?? null,
      type: entry.type,
      minutes: entry.minutes,
      status: entry.status ?? 'posted',
      expiresAt: entry.expiresAt ?? null,
      balanceAfter: entry.balanceAfter,
      description: entry.description ?? null,
      idempotencyKey: entry.idempotencyKey ?? null,
    })
    .returning();
  return row;
}

/** Lança a violação de unicidade de idempotência para o chamador tratar. */
export function isIdempotencyConflict(err: unknown): boolean {
  const code = (err as { code?: string }).code;
  const constraint = (err as { constraint?: string }).constraint;
  return code === '23505' && constraint === 'wallet_entries_idempotency_unique';
}

/** Busca a reserva (`hold`) ativa de um agendamento. */
export async function findHoldForBooking(
  executor: Executor,
  bookingId: string,
  userId: string,
): Promise<typeof walletEntries.$inferSelect | undefined> {
  const [row] = await executor
    .select()
    .from(walletEntries)
    .where(
      and(
        eq(walletEntries.bookingId, bookingId),
        eq(walletEntries.userId, userId),
        eq(walletEntries.type, 'session_spent'),
        eq(walletEntries.status, 'held'),
      ),
    )
    .limit(1);
  return row;
}

/**
 * Transição de status **da reserva** — única mutação permitida no ledger (ver ADR-006).
 *  - `held → released`: a reserva foi desfeita (recusa, cancelamento com reembolso total);
 *  - `held → posted`   : a reserva foi consumida (conclusão bilateral, penalidade total).
 *
 * Nunca altera `minutes`, `type`, `user_id` ou `booking_id`.
 */
export async function transitionHold(
  executor: Executor,
  holdId: string,
  to: 'released' | 'posted',
  balanceAfter: number,
): Promise<void> {
  await executor
    .update(walletEntries)
    .set({ status: to, balanceAfter })
    .where(and(eq(walletEntries.id, holdId), eq(walletEntries.status, 'held')));
}

/** Extrato paginado por cursor (NF-P06), do mais recente para o mais antigo. */
export async function listEntries(
  executor: Executor,
  userId: string,
  opts: { limit: number; cursor?: { createdAt: string; id: string } | null; type?: EntryType },
): Promise<(typeof walletEntries.$inferSelect)[]> {
  const filters = [eq(walletEntries.userId, userId)];
  if (opts.type) filters.push(eq(walletEntries.type, opts.type));
  if (opts.cursor) {
    const cursorDate = new Date(opts.cursor.createdAt);
    filters.push(
      sql<boolean>`(${walletEntries.createdAt}, ${walletEntries.id}) < (${cursorDate}, ${opts.cursor.id}::uuid)`,
    );
  }
  return executor
    .select()
    .from(walletEntries)
    .where(and(...filters))
    .orderBy(desc(walletEntries.createdAt), desc(walletEntries.id))
    .limit(opts.limit + 1);
}

/**
 * BR-105 / BR-106 — créditos expiráveis ainda `posted` cujo `expires_at` já passou.
 * Ordenado por `expires_at` (FIFO: o mais antigo primeiro).
 */
export async function findExpirableEntries(
  executor: Executor,
  now: Date,
  limit: number,
): Promise<(typeof walletEntries.$inferSelect)[]> {
  return executor
    .select()
    .from(walletEntries)
    .where(
      and(
        eq(walletEntries.status, 'posted'),
        sql`${walletEntries.expiresAt} IS NOT NULL`,
        lt(walletEntries.expiresAt, now),
      ),
    )
    .orderBy(asc(walletEntries.expiresAt), asc(walletEntries.createdAt))
    .limit(limit);
}

/** Usuários distintos com crédito expirável — usado pelo job para aplicar lock por usuário. */
export async function findUsersWithExpirableEntries(
  executor: Executor,
  now: Date,
  limit: number,
): Promise<{ userId: string }[]> {
  return queryRows<{ userId: string }>(
    executor,
    sql`
    SELECT DISTINCT user_id AS "userId"
    FROM wallet_entries
    WHERE status = 'posted' AND expires_at IS NOT NULL AND expires_at < ${now}
    LIMIT ${limit}`,
  );
}

/** Vencimento do crédito mais antigo ainda válido (aviso "seus créditos expiram em..."). */
export async function findNextExpiry(
  executor: Executor,
  userId: string,
  now = new Date(),
): Promise<Date | null> {
  const [row] = await executor
    .select({ expiresAt: walletEntries.expiresAt })
    .from(walletEntries)
    .where(
      and(
        eq(walletEntries.userId, userId),
        eq(walletEntries.status, 'posted'),
        sql`${walletEntries.expiresAt} IS NOT NULL`,
        sql`${walletEntries.expiresAt} > ${now}`,
      ),
    )
    .orderBy(asc(walletEntries.expiresAt))
    .limit(1);
  return row?.expiresAt ?? null;
}