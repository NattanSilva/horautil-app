/**
 * Barrel do schema — único ponto de import do Drizzle por toda a aplicação.
 *
 * Assim, `drizzle-kit generate` e o `drizzle()` recebem exatamente o mesmo conjunto
 * de tabelas/enums/relations, e o contrato de dados do PRD §3.3 fica explícito.
 */
export * from './enums.js';
export * from './users.js';
export * from './categories.js';
export * from './user-skills.js';
export * from './availability-slots.js';
export * from './bookings.js';
export * from './wallet-entries.js';
export * from './reviews.js';
export * from './support.js';
export * from './relations.js';