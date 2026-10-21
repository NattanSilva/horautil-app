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
├── screens/          # Preview exportada das 8 telas principais (PNG 375×812)
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
