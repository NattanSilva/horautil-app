# HoraUtil

Rede social mobile baseada em **Banco de Horas**: 1 hora ensinando algo dá direito a 1 hora de crédito para receber aula de outra habilidade.

## Screens

Prévia das **8 telas principais** do MVP (375×812), renderizadas a partir dos artboards oficiais em `Design.pen`.

<div align="center">
  <table>
    <tr>
      <td width="25%" align="center" valign="top">
        <img src="screens/01%20Login.png" width="190" alt="Tela de Login"><br>
        <b>01 · Login</b><br>
        <sub>Acesso por e-mail/senha, login social e recuperação de senha</sub>
      </td>
      <td width="25%" align="center" valign="top">
        <img src="screens/02%20Cadastro.png" width="190" alt="Tela de Cadastro"><br>
        <b>02 · Cadastro</b><br>
        <sub>Nome, e-mail, telefone, senha e aceite dos termos</sub>
      </td>
      <td width="25%" align="center" valign="top">
        <img src="screens/03%20Onboarding.png" width="190" alt="Tela de Onboarding"><br>
        <b>03 · Onboarding</b><br>
        <sub>Habilidades que ensinam, que quer aprender e disponibilidade</sub>
      </td>
      <td width="25%" align="center" valign="top">
        <img src="screens/04%20Explorar.png" width="190" alt="Tela Explorar"><br>
        <b>04 · Explorar</b><br>
        <sub>Busca, categorias e matches com percentual de compatibilidade</sub>
      </td>
    </tr>
    <tr>
      <td width="25%" align="center" valign="top">
        <img src="screens/05%20Perfil%20%26%20Agendar.png" width="190" alt="Tela de Perfil e Agendar"><br>
        <b>05 · Perfil &amp; Agendar</b><br>
        <sub>Perfil do professor, calendário, horários e duração da aula</sub>
      </td>
      <td width="25%" align="center" valign="top">
        <img src="screens/06%20Agenda.png" width="190" alt="Tela de Agenda"><br>
        <b>06 · Agenda</b><br>
        <sub>Agendamentos separados em Pendentes, Aceitos e Concluídos</sub>
      </td>
      <td width="25%" align="center" valign="top">
        <img src="screens/07%20Carteira.png" width="190" alt="Tela de Carteira"><br>
        <b>07 · Carteira</b><br>
        <sub>Saldo disponível, horas dadas/recebidas/pendentes e extrato</sub>
      </td>
      <td width="25%" align="center" valign="top">
        <img src="screens/08%20Review%20P%C3%B3s-Aula.png" width="190" alt="Tela de Review Pós-Aula"><br>
        <b>08 · Review Pós-Aula</b><br>
        <sub>Estrelas, rótulo automático e feedback textual da aula</sub>
      </td>
    </tr>
  </table>
</div>

### Fluxo principal

`Login/Cadastro` → `Onboarding` → `Explorar` → `Perfil & Agendar` → `Agenda` → `Carteira` → `Review`

| Tela | Etapa do fluxo | Destaques |
|------|----------------|-----------|
| **Login** | Autenticação | E-mail + senha, OAuth (Google/Apple), link de recuperação |
| **Cadastro** | Autenticação | Validação de telefone, senha mín. 8 caracteres, aceite de termos |
| **Onboarding** | Perfil (2/3) | Chips de habilidades, disponibilidade por dia e turno, bônus de 120 min |
| **Explorar** | Descoberta | Busca por habilidade/pessoa, categorias fechadas, ranking por score de match |
| **Perfil & Agendar** | Match → Booking | Nota, agenda mensal, seleção de horário e duração (30/60/90 min) |
| **Agenda** | Booking | Status de Pendente/Aceito/Concluído e agendamento concluído |
| **Carteira** | Wallet | Saldo derivado do ledger, pendências e histórico de entradas/saídas |
| **Review** | Pós-aula | Avaliação por estrelas, rótulo de sentiment e comentário (1 por sessão) |

## Stack

**Kotlin (Android Nativo) · Jetpack Compose · Retrofit · Fastify (Node.js) · TypeScript · PostgreSQL + Drizzle ORM**

| Camada | Tecnologia |
|--------|-----------|
| Mobile | Kotlin (Android nativo) + Jetpack Compose (Material 3) — `apps/mobile` |
| Design System | Tokens Material 3 (`Color.kt`, `Type.kt`, `Theme.kt`) — `packages/ui` + `apps/mobile/.../ui/theme` |
| Rede (Mobile → API) | Retrofit + OkHttp + Kotlin Serialization (REST `/v1`) |
| API | Fastify (Node.js) + TypeScript — `apps/api` |
| DB | PostgreSQL + Drizzle ORM — `packages/db` |
| Contratos | Schemas Zod (validação na borda da API) — `packages/contracts` |
| Auth | JWT (access 15 min) + refresh rotativo (30 d, hash), Argon2id |

## Estrutura

```
horaUtil/
├── apps/
│   ├── api/src/modules/{auth,profile,search,booking,wallet,review}
│   └── mobile/                       # Android nativo (Kotlin + Compose)
│       ├── app/src/main/java/br/com/horautil/
│       │   ├── ui/                   # Telas Compose (auth, tabs, booking)
│       │   ├── viewmodel/            # ViewModels por feature (MVVM)
│       │   ├── data/                 # Retrofit + Repositories + cache (Room)
│       │   ├── domain/               # Modelos e casos de uso
│       │   └── di/                   # Injeção de dependências
│       ├── app/src/main/res/         # Tema Material 3, strings, drawables
│       └── build.gradle.kts
├── packages/{db,ui,contracts}
├── Design.pen        # Design oficial (pen.dev) — telas + Style Guide
├── screens/          # Preview exportada das 8 telas principais (PNG 375×812)
├── STYLE_GUIDE.md    # Tokens de design + tema Jetpack Compose
└── PRD.md            # Requisitos do produto (MVP v1.0)
```

## Desenvolvimento

```bash
# API + DB
pnpm install
pnpm --filter db drizzle-kit generate
pnpm --filter db drizzle-kit migrate
pnpm --filter api dev               # Fastify :3333

# Mobile (Android nativo)
cd apps/mobile && ./gradlew assembleDebug
cd apps/mobile && ./gradlew installDebug

# Qualidade
pnpm lint
pnpm typecheck
pnpm --filter api test
```

## Design

- `Design.pen` contém os 8 artboards principais (Login, Cadastro, Onboarding, Explorar, Perfil & Agendar, Agenda, Carteira, Review) em **375×812**, mais o artboard **`00 Style Guide`** em 1440×1024 com tokens e componentes.
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
