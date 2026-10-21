/**
 * `user_skills` — PRD §7.2.
 *
 * BR-201 catálogo fechado · BR-202 nível obrigatório em `teach` · BR-203 máx. 10 por modo.
 * `level IS NOT NULL` para `teach` é garantido por CHECK no banco (fail-closed).
 */
import { sql } from 'drizzle-orm';
import { check, index, pgTable, smallint, text, uniqueIndex, uuid } from 'drizzle-orm/pg-core';

import { categories } from './categories.js';
import { skillLevel, skillMode } from './enums.js';
import { users } from './users.js';

export const userSkills = pgTable(
  'user_skills',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    categoryId: uuid('category_id')
      .notNull()
      .references(() => categories.id),
    mode: skillMode('mode').notNull(),
    /** BR-202 — obrigatório quando `mode = 'teach'`. */
    level: skillLevel('level'),
    /** Prioridade de aprendizagem: 1 = alta, 3 = padrão (F1.8). */
    priority: smallint('priority').default(3),
    description: text('description'),
  },
  (t) => [
    uniqueIndex('user_skills_user_category_mode_unique').on(t.userId, t.categoryId, t.mode),
    // BR-204 / F2.5 — busca de match por categoria + modo
    index('idx_user_skills_category_mode').on(t.categoryId, t.mode),
    index('idx_user_skills_user_mode').on(t.userId, t.mode),
    check('user_skills_teach_requires_level', sql`${t.mode} <> 'teach' OR ${t.level} IS NOT NULL`),
    check('user_skills_priority_range', sql`${t.priority} IS NULL OR (${t.priority} BETWEEN 1 AND 3)`),
  ],
);

export type UserSkill = typeof userSkills.$inferSelect;
export type NewUserSkill = typeof userSkills.$inferInsert;