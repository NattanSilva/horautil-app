# AGENTS.md — HoraUtil

> Compact guidance for OpenCode agents working on this repo. Source of truth: PRD.md (v1.0 MVP).

---

## Stack & Architecture

| Layer | Tech | Notes |
|-------|------|-------|
| Mobile | Kotlin (Android nativo) + Jetpack Compose (Material 3) | `apps/mobile` |
| Networking | Retrofit + OkHttp + kotlinx.serialization | Client REST contra `/v1` |
| Architecture (mobile) | MVVM — `ui/` + `viewmodel/` + `domain/` + `data/` + `di/` | `apps/mobile/app/src/main/java/br/com/horautil/` |
| Cache local | Room / DataStore (categorias + perfil) | `apps/mobile/.../data/` |
| API | Fastify (Node.js) + TypeScript | `apps/api` |
| DB | PostgreSQL + Drizzle ORM | `packages/db` (schema compartilhado) |
| UI | Design tokens Material 3 (`Color.kt`, `Type.kt`, `Theme.kt`) | `packages/ui` + `apps/mobile/.../ui/theme` |
| Contracts | Zod schemas da API (espelhados nos DTOs Kotlin) | `packages/contracts` |
| Auth | JWT (15min access) + rotating refresh tokens (30d, hashed) | Argon2id passwords |

**Monorepo structure (planned):**
```
horaUtil/
├── apps/
│   ├── api/src/modules/{auth,profile,search,booking,wallet,review}
│   └── mobile/                              # Kotlin (Android Nativo) + Jetpack Compose
│       ├── app/src/main/java/br/com/horautil/
│       │   ├── ui/                          # Telas Compose (auth, tabs, booking)
│       │   ├── viewmodel/                   # ViewModels por feature (MVVM)
│       │   ├── data/                        # Retrofit + Repositories + cache (Room)
│       │   ├── domain/                      # Modelos e casos de uso
│       │   └── di/                          # Injeção de dependências
│       ├── app/src/main/res/                # Tema Material 3, strings, drawables
│       └── build.gradle.kts
└── packages/{db,ui,contracts}
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

### Mobile (Android)
- **100% Jetpack Compose** — no XML layouts, single activity, Compose Navigation
- **MVVM**: `ui/` (stateless composables) → `viewmodel/` (StateFlow) → `domain/` (use cases) → `data/` (Retrofit + Room) → `di/` (Hilt)
- Composable functions are **stateless** — state and events flow through a `ViewModel` exposing `StateFlow<UiState>`
- **Design tokens only**: never hardcode hex, dp, or sp in screens — use `Color.kt`, `Type.kt`, `Theme.kt` (`br.com.horautil.ui.theme`) and the tokens in `STYLE_GUIDE.md`
- **Networking**: Retrofit + OkHttp + kotlinx.serialization; base URL from `BuildConfig`; DTOs in `data/` map 1:1 to the Zod schemas in `packages/contracts`
- **Auth**: access token in memory only; refresh token persisted via `EncryptedSharedPreferences`; `Authorization: Bearer` via OkHttp interceptor — never log tokens
- **Offline/resilience**: cache categorias + perfil with Room/DataStore; retry exponencial (3×) on network failure (NF-R01..R04)
- **Acessibilidade (NF-UX)**: pt-BR only, dark mode from system, touch targets ≥ 48×48 dp, contraste WCAG AA, estados vazios com ilustração + CTA
- Screens mirror the artboards in `Design.pen` and the PNGs in `screens/` (375×812) — match spacing, radii, and elevation exactly

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
- Vitest for API/packaged unit tests (shared)
- Integration: `supertest` + Testcontainers (Postgres)
- E2E: critical flows (signup → match → booking → completion → review)
- Android: JUnit + `kotlinx-coroutines-test` for unit, Compose UI Test for instrumented, Room in-memory for DAO tests
- Coverage ≥80% on `packages/db`, `wallet`, `booking` services
- CI: lint → typecheck → test (zero TS errors on main **and** ktlint/detekt clean on the Android app)

---

## Dev Workflow (when implemented)

```bash
# From repo root (monorepo)
# Install
pnpm install

# DB
pnpm --filter db drizzle-kit generate
pnpm --filter db drizzle-kit migrate

# API
pnpm --filter api dev    # Fastify on :3333

# Mobile (Android nativo) — from apps/mobile
./gradlew assembleDebug   # build APK
./gradlew installDebug    # install no device/emulador
./gradlew test             # testes unitários
./gradlew lint ktlintCheck detekt   # lint + análise estática

# Test (API)
pnpm --filter api test

# Lint + typecheck (API/pacotes)
pnpm lint
pnpm typecheck
```

---

## Module Ownership (per PRD)

| Module | Owner | Key Tables | Mobile (Compose) |
|--------|-------|------------|------------------|
| `auth` / `profile` | Dev 1 | `users`, `categories`, `user_skills`, `availability_slots` | Login, Cadastro, Onboarding, Perfil |
| `search` | Dev 2 | reads above + `reviews` for rating | Explorar |
| `booking` | Dev 3 | `bookings`, `availability_slots` | Perfil & Agendar, Agenda |
| `wallet` | Dev 4 | `wallet_entries` (ledger) | Carteira |
| `review` | Dev 5 | `reviews` | Review Pós-Aula |

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
- ❌ Don't hardcode colors/spacing in Composables — only design tokens from `Theme.kt`
- ❌ Don't put the access token in DataStore/SharedPreferences — memory only; refresh token only via `EncryptedSharedPreferences`
- ❌ Don't call the API from a Composable — go through ViewModel → use case → repository
- ❌ Don't log tokens, e-mail, or phone (PII) — NF-S09 / LGPD

---

## References

- Full PRD: `PRD.md` (business rules, API contracts, DB schema, user flows) — **source of truth**
- Design: `Design.pen` (pen.dev file — open via pencil tools)
- Design system: `STYLE_GUIDE.md` (tokens, `Color.kt`, `Type.kt`, `Theme.kt`)
- Screen preview: `screens/*.png` (8 telas, 375×812)