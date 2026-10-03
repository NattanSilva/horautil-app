# AGENTS.md — HoraUtil

> Compact guidance for OpenCode agents working on this repo. Source of truth: PRD.md (v1.0 MVP).

---

## Stack & Architecture

| Layer | Tech | Notes |
|-------|------|-------|
| Mobile | React Native (Expo Router) + TypeScript | `apps/mobile` |
| API | Fastify + TypeScript | `apps/api` |
| DB | PostgreSQL + Drizzle ORM | `packages/db` (shared schema) |
| UI | Shared components | `packages/ui` |
| Contracts | Zod schemas shared | `packages/contracts` |
| Auth | JWT (15min access) + rotating refresh tokens (30d, hashed) | Argon2id passwords |

**Monorepo structure (planned):**
```
horaUtil/
├── apps/
│   ├── api/src/modules/{auth,profile,search,booking,wallet,review}
│   └── mobile/app/{(auth),(tabs),booking}
├── packages/{db,ui,contracts}
```

---

## Key Conventions (from PRD)

### Database
- **Ledger is append-only**: `wallet_entries` never updated; corrections via `reversal` entries
- **Balance derived**: `available = posted - held` (view `user_wallet_balance`)
- **Booking conflicts prevented** by Postgres `EXCLUDE USING gist` on `(teacher_id, tstzrange)`
- **Enums** defined in Drizzle: `skill_mode`, `skill_level`, `user_status`, `booking_status`, `entry_type`, `entry_status`

### API
- Versioned prefix: `/v1`
- All write ops validate `user_id` from JWT (never from body)
- Zod validation on every route; max payload 1 MB
- Cursor pagination everywhere (no `OFFSET`)

### Business Rules (high-signal)
| Area | Rule |
|------|------|
| Credits | Welcome bonus: **+120 min** once on onboarding complete (BR-101) |
| Credits | Expire **90 days** after entry, FIFO consumption (BR-105) |
| Credits | Hold on booking request; release/transfer only on bilateral completion (BR-103, BR-104) |
| Booking | Duration: 30–180 min, multiples of 30 (BR-301) |
| Booking | Min 2h advance, max 90 days horizon (BR-302, BR-303) |
| Booking | Pending expires in 48h (BR-304) |
| Cancellation | >12h: 100% refund; 2–12h: 50%; <2h: 0% + reputation hit (BR-401–404) |
| Reviews | Only after `completed`, 1 per session, within 7 days (BR-501–503) |
| Matching | Score weights in config (`MATCHING_WEIGHTS`): 40% skillMatch, 20% rating, 15% mutualInterest, 15% availability, 10% recency |

### Security
- Refresh tokens: HttpOnly + Secure + SameSite=Strict; access token in memory only
- Rate limit: 100 req/min general, 10 req/min on `/auth/*`
- Helmet + explicit CORS allowlist
- Argon2id (or bcrypt ≥12) for passwords

### Testing (NF-Q)
- Vitest for unit tests (shared)
- Integration: `supertest` + Testcontainers (Postgres)
- E2E: critical flows (signup → match → booking → completion → review)
- Coverage ≥80% on `packages/db`, `wallet`, `booking` services
- CI: lint → typecheck → test (zero TS errors on main)

---

## Dev Workflow (when implemented)

```bash
# From repo root (monorepo)
# Install
pnpm install

# DB
pnpm --filter db drizzle-kit generate
pnpm --filter db drizzle-kit migrate

# Dev servers
pnpm --filter api dev    # Fastify on :3333
pnpm --filter mobile dev # Expo

# Test
pnpm --filter api test
pnpm --filter mobile test

# Lint + typecheck
pnpm lint
pnpm typecheck
```

---

## Module Ownership (per PRD)

| Module | Owner | Key Tables |
|--------|-------|------------|
| `auth` / `profile` | Dev 1 | `users`, `categories`, `user_skills`, `availability_slots` |
| `search` | Dev 2 | reads above + `reviews` for rating |
| `booking` | Dev 3 | `bookings`, `availability_slots` |
| `wallet` | Dev 4 | `wallet_entries` (ledger) |
| `review` | Dev 5 | `reviews` |

**Contract**: Dev 1 owns schema for `users`, `categories`, `user_skills`, `availability_slots`. Changes via single PR to `packages/db`.

---

## Environment Variables (required)

| Variable | Description |
|----------|-------------|
| `DATABASE_URL` | Postgres connection string |
| `JWT_SECRET` | HS256/RS256 secret for access tokens |
| `REFRESH_TOKEN_SECRET` | For signing refresh tokens (or use same) |
| `SENTRY_DSN` | Error tracking |
| `REDIS_URL` | Optional (rate limit, match cache) |

---

## Gotchas to Avoid

- ❌ Don't store balance as a column on `users` — always derive from `wallet_entries`
- ❌ Don't use `UPDATE` on ledger — only `INSERT` with `reversal` type
- ❌ Don't accept `user_id` from request body on write endpoints
- ❌ Don't use `OFFSET` pagination — cursor only
- ❌ Don't create free-text categories — closed catalog from `categories` table
- ❌ Don't expose email/phone in any API response

---

## References

- Full PRD: `PRD.md` (business rules, API contracts, DB schema, user flows)
- Design: `Design.pen` (pen.dev file — open via pencil tools)