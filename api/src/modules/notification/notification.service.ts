/**
 * Notificações internas (F3.9 — lembretes 24 h / 2 h; F5.x — convite para avaliar).
 *
 * A escrita é **sempre** dentro da transação da operação de negócio que a originou
 * (o usuário nunca recebe "convite para avaliar" de uma sessão que não foi concluída),
 * por isso a função exige um `Executor`.
 *
 * MVP: o canal de entrega é a própria tabela `notifications` (feed do app). O envio
 * de push/e-mail fica atrás da mesma função, para que os jobs passem a disparar
 * notificações sem tocar nos serviços de domínio.
 */
import { and, desc, eq, sql } from 'drizzle-orm';

import { db, type Executor } from '../../db/client.js';
import { notifications, type NotificationType } from '../../db/schema/index.js';

export interface NotifyInput {
  userId: string;
  type: NotificationType;
  title: string;
  body?: string | null;
  /** Payload livre para o app navegar (ex.: `{ booking_id }`). */
  data?: Record<string, unknown> | null;
}

/** Cria uma notificação dentro da transação corrente. */
export async function notify(executor: Executor, input: NotifyInput): Promise<void> {
  await executor.insert(notifications).values({
    userId: input.userId,
    type: input.type,
    title: input.title,
    body: input.body ?? null,
    data: input.data ?? sql`'{}'::jsonb`,
  });
}

/** Atalho para notificar as duas partes de um agendamento. */
export async function notifyBoth(
  executor: Executor,
  input: Omit<NotifyInput, 'userId'>,
  userIds: [string, string],
): Promise<void> {
  await notify(executor, { ...input, userId: userIds[0] });
  await notify(executor, { ...input, userId: userIds[1] });
}

/** Feed do usuário, paginado por cursor (`GET /v1/me/notifications`). */
export async function listNotifications(
  userId: string,
  opts: { limit: number; cursor?: { createdAt: string; id: string } | null; unreadOnly?: boolean },
) {
  const filters = [eq(notifications.userId, userId)];
  if (opts.unreadOnly) filters.push(sql`${notifications.readAt} IS NULL`);
  if (opts.cursor) {
    const cursorDate = new Date(opts.cursor.createdAt);
    filters.push(
      sql`(${notifications.createdAt}, ${notifications.id}) < (${cursorDate}, ${opts.cursor.id}::uuid)`,
    );
  }
  return db
    .select()
    .from(notifications)
    .where(and(...filters))
    .orderBy(desc(notifications.createdAt), desc(notifications.id))
    .limit(opts.limit + 1);
}

/** Marca como lida (idempotente). */
export async function markAsRead(userId: string, notificationId: string): Promise<boolean> {
  const rows = await db
    .update(notifications)
    .set({ readAt: new Date() })
    .where(
      and(
        eq(notifications.id, notificationId),
        eq(notifications.userId, userId),
        sql`${notifications.readAt} IS NULL`,
      ),
    )
    .returning({ id: notifications.id });
  return rows.length > 0;
}

/** Contador de não lidas para o badge do app. */
export async function countUnread(userId: string): Promise<number> {
  const rows = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(notifications)
    .where(and(eq(notifications.userId, userId), sql`${notifications.readAt} IS NULL`));
  return Number(rows[0]?.count ?? 0);
}

/** Marca todas as notificações como lidas. */
export async function markAllRead(userId: string): Promise<number> {
  const rows = await db
    .update(notifications)
    .set({ readAt: new Date() })
    .where(and(eq(notifications.userId, userId), sql`${notifications.readAt} IS NULL`))
    .returning({ id: notifications.id });
  return rows.length;
}