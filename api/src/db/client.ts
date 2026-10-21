/**
 * Cliente PostgreSQL + Drizzle (postgres-js).
 *
 * - `max` do pool controlado por `DB_POOL_MAX` (NF-E06: 100k usuários, 10k sessões/mês);
 * - `prepare: false` é recomendado pelo postgres-js quando há *connection pooler*
 *   (PgBouncer/Supavisor) no ambiente de produção;
 * - `sql` exposto para escopo (`tx.execute(sql\`...\`)`) em migrações e jobs.
 */
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';

import { env } from '../config/env.js';
import * as schema from './schema/index.js';

export const client = postgres(env.DATABASE_URL, {
  max: env.DB_POOL_MAX,
  idle_timeout: 20,
  connect_timeout: 10,
  prepare: false,
  onnotice: () => {
    /* ignora NOTICE do Postgres (evita poluir os logs) */
  },
});

/** Instância Drizzle tipada com o schema completo (habilita `db.query.*`). */
export const db = drizzle(client, { schema });

export type Db = typeof db;
/** Tipo do handle transacional passado ao callback de `db.transaction`. */
export type Tx = Parameters<Parameters<Db['transaction']>[0]>[0];
/** Qualquer executor de queries (conexão livre ou transação) — usada nos repositórios. */
export type Executor = Db | Tx;

/** Fecha o pool (usado no graceful shutdown e nos testes). */
export async function closeDb(): Promise<void> {
  await client.end({ timeout: 5 });
}

export { schema };