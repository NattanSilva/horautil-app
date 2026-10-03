# HoraUtil

Rede social mobile baseada em **Banco de Horas**: 1 hora ensinando algo dá direito a 1 hora de crédito para receber aula de outra habilidade.

## Stack

| Camada | Tecnologia |
|--------|-----------|
| Mobile | React Native (Expo Router) + TypeScript — `apps/mobile` |
| API | Fastify + TypeScript — `apps/api` |
| DB | PostgreSQL + Drizzle ORM — `packages/db` |
| UI | Componentes compartilhados — `packages/ui` |
| Contratos | Schemas Zod — `packages/contracts` |
| Auth | JWT (access 15 min) + refresh rotativo (30 d, hash), Argon2id |

## Estrutura

```
horaUtil/
├── apps/
│   ├── api/src/modules/{auth,profile,search,booking,wallet,review}
│   └── mobile/app/{(auth),(tabs),booking}
├── packages/{db,ui,contracts}
├── design.pen        # Design oficial (pen.dev) — telas + Style Guide
├── STYLE_GUIDE.md    # Tokens de design + tema Jetpack Compose
└── PRD.md            # Requisitos do produto (MVP v1.0)
```

## Desenvolvimento

```bash
pnpm install

# DB
pnpm --filter db drizzle-kit generate
pnpm --filter db drizzle-kit migrate

# Dev servers
pnpm --filter api dev       # Fastify :3333
pnpm --filter mobile dev    # Expo

# Qualidade
pnpm lint
pnpm typecheck
pnpm --filter api test
```

## Design

- `design.pen` contém os 8 artboards principais (Login, Cadastro, Onboarding, Explorar, Perfil & Agendar, Agenda, Carteira, Review) em **375×812**, mais o artboard **`00 Style Guide`** em 1440×1024 com tokens e componentes.
- `STYLE_GUIDE.md` documenta paleta, tipografia, espaçamento, raios de borda e inclui `Color.kt`, `Type.kt` e `Theme.kt` iniciais em Kotlin/Jetpack Compose.

## Variáveis de ambiente

| Variável | Descrição |
|----------|-----------|
| `DATABASE_URL` | Connection string do Postgres |
| `JWT_SECRET` | Segredo HS256/RS256 dos access tokens |
| `REFRESH_TOKEN_SECRET` | Segredo dos refresh tokens |
| `SENTRY_DSN` | Monitoramento de erros |
| `REDIS_URL` | Opcional (rate limit, cache de match) |

## Regras de negócio (resumo)

- Bônus de boas-vindas: +120 min uma única vez (onboarding completo).
- Créditos expiram em 90 dias, consumo FIFO.
- Duração de aula: 30–180 min em múltiplos de 30; mín. 2 h de antecedência; cancelamento >12 h = 100% reembolso.
- Avaliações só após conclusão, 1 por sessão, em até 7 dias.
- Matching: 40% skillMatch, 20% rating, 15% mutualInterest, 15% availability, 10% recency.

## Documentação

- `PRD.md` — produto, regras, contratos de API, schema do banco e user flows.
- `AGENTS.md` — guia de convenções para agentes de código.
