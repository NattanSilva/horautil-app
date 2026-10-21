# HoraUtil

Rede social mobile baseada em **Banco de Horas**: 1 hora ensinando algo dá direito a 1 hora de crédito para receber aula de outra habilidade.

## Stack

| Camada    | Tecnologia                                                    |
| --------- | ------------------------------------------------------------- |
| Mobile    | React Native (Expo Router) + TypeScript — `apps/mobile`       |
| API       | Fastify + TypeScript — `apps/api`                             |
| DB        | PostgreSQL + Drizzle ORM — `packages/db`                      |
| UI        | Componentes compartilhados — `packages/ui`                    |
| Contratos | Schemas Zod — `packages/contracts`                            |
| Auth      | JWT (access 15 min) + refresh rotativo (30 d, hash), Argon2id |

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

| Variável               | Descrição                             |
| ---------------------- | ------------------------------------- |
| `DATABASE_URL`         | Connection string do Postgres         |
| `JWT_SECRET`           | Segredo HS256/RS256 dos access tokens |
| `REFRESH_TOKEN_SECRET` | Segredo dos refresh tokens            |
| `SENTRY_DSN`           | Monitoramento de erros                |
| `REDIS_URL`            | Opcional (rate limit, cache de match) |

## Regras de negócio (resumo)

- Bônus de boas-vindas: +120 min uma única vez (onboarding completo).
- Créditos expiram em 90 dias, consumo FIFO.
- Duração de aula: 30–180 min em múltiplos de 30; mín. 2 h de antecedência; cancelamento >12 h = 100% reembolso.
- Avaliações só após conclusão, 1 por sessão, em até 7 dias.
- Matching: 40% skillMatch, 20% rating, 15% mutualInterest, 15% availability, 10% recency.

## Documentação

- `PRD.md` — produto, regras, contratos de API, schema do banco e user flows.
- `AGENTS.md` — guia de convenções para agentes de código.

## API (Backend)

A API REST do **HoraUtil** está localizada em [`/api`](./api) e foi construída com [Fastify 5](https://fastify.dev/), [TypeScript](https://www.typescriptlang.org/), [PostgreSQL 16](https://www.postgresql.org/) e [Drizzle ORM](https://orm.drizzle.team/).

### Stack

- **Framework**: Fastify + TypeProvider Zod
- **Validação**: [Zod](https://zod.dev/) em todos os inputs/outputs
- **Autenticação**: JWT (Access 15min) + Refresh Tokens opacos com rotação e reuse detection
- **Banco de dados**: PostgreSQL + Drizzle ORM
- **Segurança**: Helmet, CORS com allowlist, Rate Limit (@fastify/rate-limit)
- **Hash de senhas**: [@node-rs/argon2](https://github.com/napi-rs/node-rs/tree/main/packages/argon2) (Argon2id)
- **Documentação**: Swagger/OpenAPI (@fastify/swagger + @fastify/swagger-ui)
- **Testes**: [Vitest](https://vitest.dev/) + Supertest

---

### Pré-requisitos

- [Node.js](https://nodejs.org/) >= 22
- [pnpm](https://pnpm.io/) >= 9
- [Docker](https://www.docker.com/) + [Docker Compose](https://docs.docker.com/compose/) (recomendado)
- [PostgreSQL](https://www.postgresql.org/) 16+ (apenas se for rodar localmente sem Docker)

---

### Estrutura da API

```text
api/
├── src/
│   ├── app.ts                # Construção da aplicação Fastify
│   ├── server.ts             # Inicialização + graceful shutdown
│   ├── config/               # Variáveis de ambiente e constantes
│   ├── db/                   # Schema, cliente, invariantes, seed e migrações
│   │   ├── client.ts
│   │   ├── invariants.ts     # EXCLUDE gist, views, triggers (migrações customizadas)
│   │   ├── schema/           # Schemas Drizzle (enums, tabelas, relations)
│   │   └── seed.ts           # Seed de dados base (categorias)
│   ├── modules/              # Domínios da aplicação
│   │   ├── auth/
│   │   ├── profile/
│   │   ├── catalog/
│   │   ├── search/
│   │   ├── booking/
│   │   ├── wallet/
│   │   ├── review/
│   │   ├── notification/
│   │   └── internal/         # Jobs internos (expiração, auto-confirm)
│   ├── plugins/              # Plugins Fastify (security, auth, swagger)
│   ├── routes/               # Agregação de rotas (/v1)
│   └── shared/               # Utilitários compartilhados
│       ├── auth/             # Password, tokens, guards
│       ├── errors.ts         # Códigos de erro e AppError
│       ├── error-handler.ts  # Tratamento global de erros
│       ├── pagination.ts     # Cursor pagination (sem OFFSET)
│       ├── datetime.ts       # Helpers de data/hora (UTC)
│       ├── http.ts
│       ├── audit.ts
│       └── logger.ts
├── drizzle/                  # Migrações Drizzle (geradas + customizadas)
├── .env.example              # Variáveis de ambiente de exemplo
├── .dockerignore
├── Dockerfile
├── docker-compose.yml
├── drizzle.config.ts
├── tsconfig.json
└── package.json
```

1. Configurar variáveis de ambiente
   Na pasta api/, copie o .env.example para .env:

cd api
cp .env.example .env
Edite o .env com seus valores. Para rodar com Docker Compose, as variáveis abaixo já possuem defaults seguros para desenvolvimento local:

Variável Obrigatório Descrição
PORT Sim Porta da API (padrão: 3333)
HOST Sim Host de escuta (use 0.0.0.0 no Docker)
NODE_ENV Sim development | production | test
DATABASE_URL Sim String de conexão PostgreSQL
POSTGRES_USER Opcional Usuário do Postgres (Docker)
POSTGRES_PASSWORD Opcional Senha do Postgres (Docker)
POSTGRES_DB Opcional Nome do banco (Docker)
JWT_SECRET Sim Chave para assinar Access Tokens (mín. 32 bytes)
JWT_ACCESS_TTL Sim TTL do access token em segundos (padrão: 900 = 15min)
REFRESH_TOKEN_SECRET Sim Chave para assinar Refresh Tokens (mín. 32 bytes)
REFRESH_TOKEN_TTL Sim TTL em segundos (padrão: 2592000 = 30 dias)
REFRESH_TOKEN_PEPPER Recomendado Pepper adicional para hash de refresh tokens
REFRESH_TOKEN_COOKIE_NAME Sim Nome do cookie HttpOnly (padrão: rt)
REFRESH_TOKEN_COOKIE_SECURE Sim true em produção (HTTPS), false em dev
REFRESH_TOKEN_COOKIE_SAMESITE Sim strict (recomendado)
CORS_ALLOWLIST Sim Lista separada por vírgulas de origens permitidas
RATE_LIMIT_MAX Sim Req/min geral (padrão: 100)
AUTH_RATE_LIMIT_MAX Sim Req/min em /v1/auth/\* (padrão: 10)
SENTRY_DSN Opcional DSN do Sentry para monitoramento de erros
Importante (Produção): Em ambiente com HTTPS, defina REFRESH_TOKEN_COOKIE_SECURE=true. Gere segredos fortes para JWT_SECRET, REFRESH_TOKEN_SECRET e REFRESH_TOKEN_PEPPER.

2. Executando com Docker (recomendado)
   Na pasta api/, execute:

# Build + subir API e PostgreSQL em background

docker compose up --build -d
A API ficará disponível em http://localhost:3333.

Comandos úteis:

# Ver logs da API (tempo real)

docker compose logs -f api

# Ver logs do PostgreSQL

docker compose logs -f postgres

# Ver status dos containers

docker compose ps

# Parar todos os containers

docker compose down

# Parar e remover volumes (⚠️ apaga todos os dados do banco)

docker compose down -v

# Rebuild apenas da API

docker compose up --build api -d
Nota: O container da API executa pnpm db:migrate automaticamente no CMD antes de iniciar o servidor. Isso aplica todas as migrações (Drizzle + customizadas) assim que o PostgreSQL estiver saudável.

3. Executando localmente (sem Docker)
   Instalar dependências
   cd api
   pnpm install
   Preparar o banco de dados

# 1. Gerar migrações com base no schema (após alterações)

pnpm db:generate

# 2. Aplicar migrações no banco

pnpm db:migrate

# 3. Popular dados básicos (categorias do catálogo)

pnpm db:seed
Rodar em modo desenvolvimento
pnpm dev
A API estará disponível em http://localhost:3333 com hot reload via `tsx`.

Rodar build de produção localmente

# Compilar TypeScript para dist/

pnpm build

# Executar versão compilada

pnpm start 4. Scripts disponíveis (api/package.json)
Script Descrição
pnpm dev Inicia servidor em modo desenvolvimento (tsx watch src/server.ts)
pnpm build Compila para dist/ com tsc (tsconfig.build.json)
pnpm start Executa build de produção (node dist/server.js)
pnpm typecheck Verifica tipos TypeScript sem emitir arquivos (tsc --noEmit)
pnpm test Executa testes com Vitest (modo run)
pnpm test:watch Executa testes em modo watch
pnpm test:coverage Gera relatório de cobertura de testes (V8)
pnpm db:generate Gera arquivos de migração do Drizzle (drizzle-kit generate)
pnpm db:migrate Aplica migrações pendentes (drizzle-kit migrate)
pnpm db:push Sincroniza schema diretamente (apenas dev, não recomendado para produção)
pnpm db:studio Abre Drizzle Studio para inspecionar o banco
pnpm db:seed Executa seed de categorias (tsx src/db/seed.ts) 5. Documentação da API (Swagger)
Com a API rodando em development, a documentação interativa está disponível em:

Swagger UI: http://localhost:3333/docs
OpenAPI JSON: http://localhost:3333/docs/json
A documentação inclui schemas Zod compartilhados, exemplos de requests/responses e envelope de erros padronizado (ErrorResponse).

6. Arquitetura, Regras e Decisões
   Padrões da API
   Prefixo versionado: Todas as rotas públicas/privadas sob /v1
   Envelope de resposta: Respostas de lista usam { data, meta } (cursor pagination). Respostas de item único retornam o objeto diretamente
   Paginação: Cursor-based (nunca OFFSET). Implementado em `shared/pagination.ts`
   Erros padronizados: Envelope { error: { code, message, details? }, requestId } com mapeamento global de Zod/Postgres → códigos canônicos (`shared/errors.ts`)
   Validação estrita: Zod em body, querystring, params em todas as rotas
   Autenticação: Access token via Authorization: Bearer <token> (somente em memória no cliente). Refresh token apenas via cookie HttpOnly + Secure + SameSite=Strict em /v1/auth
   Anti-enumeration: Login retorna erro genérico em caso de credenciais inválidas
   Modelo de Dados (Destaques)
   Ledger append-only: wallet_entries nunca são atualizados. Correções feitas via entradas de reversal (reversão). Saldo é derivado, nunca armazenado em coluna (users.balance).
   Invariantes de concorrência: EXCLUDE USING gist no bookings (teacher_id + tstzrange) impede sobreposição para status bloqueantes. Definido via migração customizada (`db/invariants.ts`).
   View de saldo: user_wallet_balance (deriva available = posted - held, total = available + held) via migração customizada.
   Gatilhos (triggers): updated_at automático, tsvector para busca em categorias e trigger para evitar saldo disponível negativo (BR-107).
   Extensões PostgreSQL: Requer pgcrypto e btree_gist (criadas nas migrações customizadas).
   ADR-006: Detalha a modelagem do ledger (signed types, hold lifecycle, transações com SELECT ... FOR UPDATE e derivação de saldo. Consulte `PRD.md` para regras de negócio completas.

7. Testes, Qualidade e Cobertura

# Rodar todos os testes

cd api && pnpm test

# Modo watch (desenvolvimento)

pnpm test:watch

# Cobertura de testes (>= 80% em db, wallet e booking - NF-Q01)

pnpm test:coverage
Requisitos de qualidade (NF-Q):

Cobertura mínima: ≥ 80% em packages/db/domínios críticos (wallet, booking) — conforme PRD
TypeScript: zero TS errors na branch main (pnpm typecheck deve passar sem erros)
Lint + Typecheck: Obrigatórios antes de abrir PR 8. Migrações (Drizzle + Customizadas)
O projeto utiliza Drizzle Kit para migrações de schema e migrações SQL customizadas para invariantes que Drizzle não consegue expressar (EXCLUDE, VIEWs, TRIGGERS).

Fluxo de trabalho:

Altere schemas em `src/db/schema/`
Gere migrações: cd api && pnpm db:generate
Revise o SQL gerado em `drizzle/`. As invariantes (gist, view, triggers) são definidas em `src/db/invariants.ts` e devem constar nas migrações customizadas geradas
Aplique: pnpm db:migrate
Nunca edite wallet_entries diretamente (somente INSERT). Ledger é append-only.
Importante: Em produção, nunca utilize db:push. Sempre utilize migrações versionadas (db:generate + db:migrate).

9. Troubleshooting
   Problema Causa provável Solução
   EADDRINUSE: address already in use :::3333 Porta 3333 ocupada Altere PORT no .env ou libere a porta
   ECONNREFUSED ao conectar no Postgres (local) Banco não está rodando Inicie Postgres ou use docker compose up -d postgres
   Migrações falham no Docker Postgres ainda não saudável Aguarde healthcheck (service_healthy) ou reinicie api
   Erros de tipos após raw SQL Cast com postgres-js Usar as unknown as T[] nos resultados de executor.execute(sql\...`)` (padrão já aplicado)
   CORS bloqueado no frontend Origem não está na allowlist Adicione a URL no CORS_ALLOWLIST no .env
   Cookie rt não é enviado Secure true em HTTP/local Em dev defina REFRESH_TOKEN_COOKIE_SECURE=false. Em prod use HTTPS
   Porta 5432 ocupada (Docker) Postgres local rodando Mapeie outra porta: "5433:5432" no docker-compose.yml
10. Health Check & Base URL
    Base URL: http://localhost:3333
    Prefixo v1: http://localhost:3333/v1
    Rotas principais: Auth (/v1/auth), Profile (/v1/me), Catalog (/v1/categories), Search (/v1/search/teachers), Bookings (/v1/bookings, /v1/me/bookings), Wallet (/v1/me/wallet/\*), Reviews (/v1/bookings/:id/review, /v1/users/:id/reviews)
    Para verificar se a API está no ar, acesse a documentação Swagger (/docs) ou faça uma requisição para uma rota pública.

Referências
PRD.md — Regras de negócio, contratos de API, schema de DB e fluxos de usuário (fonte da verdade)
AGENTS.md — Guia para agentes de IA trabalhando no repositório
STYLE_GUIDE.md — Padrões de código e estilo
Design.pen — Design no pen.dev (abrir via ferramentas pencil)
