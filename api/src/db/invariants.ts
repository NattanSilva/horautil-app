/**
 * Extensões e convenções do banco HoraUtil.
 *
 * Usado pelo `drizzle.config.ts` e pelo job de migração para garantir que
 * qualquer ambiente novo tenha o mesmo baseline antes do primeiro deploy.
 */
export const REQUIRED_EXTENSIONS = ['pgcrypto', 'btree_gist'] as const;

/**
 * Objetos que o Drizzle não consegue expressar e por isso vivem em migração customizada
 * (`drizzle-kit generate --custom` → `drizzle/<ts>_hora_util_invariants.sql`):
 *
 *  1. `bookings_teacher_no_overlap` — `EXCLUDE USING gist` (BR-306 / ADR-002);
 *  2. `user_wallet_balance` — view de saldo derivado (ADR-001);
 *  3. trigger de full-text de `categories.search_vector` (NF-E05);
 *  4. trigger de `updated_at` (`users`, `bookings`).
 */
export const CUSTOM_MIGRATION_OBJECTS = [
  'bookings_teacher_no_overlap',
  'user_wallet_balance',
  'categories_search_vector_trigger',
  'set_updated_at_trigger',
] as const;