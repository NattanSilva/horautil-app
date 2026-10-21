/**
 * `categories` — PRD §7.2 (catálogo fechado, BR-201) + índice full-text em pt-BR (NF-E05).
 *
 * O usuário **não** cria categorias livres: escolhe sempre a partir desta tabela.
 * A coluna `search_vector` (tsvector, GIN) é criada por migração customizada
 * (`drizzle-kit generate --custom`) porque o tipo tsvector não é gerado pelo Drizzle.
 */
import { sql } from 'drizzle-orm';
import {
  boolean,
  customType,
  index,
  pgTable,
  timestamp,
  uniqueIndex,
  uuid,
  varchar,
  type AnyPgColumn,
} from 'drizzle-orm/pg-core';

/** tsvector — usado apenas por índices GIN, nunca lido pelo ORM. */
const tsvector = customType<{ data: string }>({
  dataType() {
    return 'tsvector';
  },
});

export const categories = pgTable(
  'categories',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    name: varchar('name', { length: 100 }).notNull(),
    /** Identificador URL — BR-201 catálogo fechado. */
    slug: varchar('slug', { length: 100 }).notNull(),
    /** Hierarquia (ex.: Música → Violão). */
    parentId: uuid('parent_id').references((): AnyPgColumn => categories.id, {
      onDelete: 'set null',
    }),
    icon: varchar('icon', { length: 50 }),
    /** Gin Full Text Search pt-BR (populado por trigger). */
    searchVector: tsvector('search_vector'),
    active: boolean('active').notNull().default(true),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    uniqueIndex('categories_slug_unique').on(t.slug),
    index('idx_categories_parent').on(t.parentId),
    index('idx_categories_search').using('gin', t.searchVector),
  ],
);

export type Category = typeof categories.$inferSelect;
export type NewCategory = typeof categories.$inferInsert;