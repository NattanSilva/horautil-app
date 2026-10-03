# HoraUtil — Style Guide (Design System)

Extraído dos layouts oficiais em `Design.pen`. Canvas mobile base: **375 × 812** (iPhone 13/14 logical px). Fonte: **Inter** (sans-serif).

---

## 1. Paleta de Cores

| Token | HEX | Uso |
|---|---|---|
| `primary` | `#7C3AED` | Cor primária (botões, FAB, seleção, chips ativos) |
| `primary-light` | `#A78BFA` | Variação clara do primário |
| `primary-dark` | `#4C1D95` | Primário escuro / textos sobre claro |
| `header-start` | `#7C3AED` | Início do gradiente do cabeçalho |
| `header-end` | `#312E81` | Fim do gradiente do cabeçalho (azul profundo) |
| `on-header` | `#FFFFFF` | Texto sobre o cabeçalho roxo |
| `on-header-sub` | `#DDD6FE` | Subtítulos sobre o cabeçalho |
| `fab-start` | `#8B5CF6` | Início do gradiente do FAB / CTA |
| `fab-end` | `#6D28D9` | Fim do gradiente do FAB / CTA |
| `page` | `#F6F5FB` | Fundo claro de inputs/chips/áreas internas |
| `card` | `#FFFFFF` | Superfície de cards e corpo principal |
| `text-primary` | `#1E1B2E` | Textos principais |
| `text-secondary` | `#8A8FA3` | Textos secundários, captions |
| `chip-active` | `#EDE9FE` | Fundo de chip/tab selecionado |

### Paleta vibrante de ícones (sobre fundos super claros, ~12% de alpha)

| Cor | HEX | Fundo | Uso |
|---|---|---|---|
| Vermelho | `#F87171` | `#FEE2E2` | Música, alertas |
| Amarelo | `#FBBF24` | `#FEF3C7` | Esportes, bônus, estrelas (`#F59E0B` texto) |
| Verde | `#34D399` | `#D1FAE5` | Status "Aceito", entradas positivas |
| Ciano | `#22D3EE` | `#CFFAFE` | Tech, entradas neutras |
| Rosa | `#F472B6` | `#FCE7F3` | Idiomas, avatares |
| Azul | `#60A5FA` | `#DBEAFE` | Categorias, recebidas |

**Gradiente oficial do cabeçalho:** linear, rotação 135°, de `#7C3AED` (0%) a `#312E81` (100%).

---

## 2. Tipografia

Família: **Inter** (pesos 400, 500, 600, 700). Mapeamento Material Design 3:

| Estilo M3 | Token Inter | Tamanho | Peso | Uso |
|---|---|---|---|---|
| `HeadlineSmall` | Headline | 26 sp | Bold (700) | Títulos de tela no header |
| `TitleLarge` | Title L | 22 sp | Bold (700) | Títulos de seção/tela |
| `TitleMedium` | Title M | 16 sp | Bold (700) | Títulos de card/seção |
| `TitleSmall` | Title S | 15 sp | Bold (700) | Labels de campo, dias |
| `BodyLarge` | Body L | 15 sp | Regular (400) | Placeholders/inputs |
| `BodyMedium` | Body M | 14 sp | Regular (400) | Texto corrido |
| `LabelLarge` | Label L | 14 sp | Semibold (600) | Botões |
| `LabelMedium` | Label M | 13 sp | Semibold (600) | Labels, chips |
| `LabelSmall` | Label S | 12 sp | Medium (500) | Tab labels, captions |
| `Caption` | Caption | 11 sp | Semibold (600) | Badges, weekdays |

Valores de destaque (ex.: saldo "12,5 horas") usam **34 sp, Bold**.

---

## 3. Espaçamento e Dimensões

| Token | Valor | Uso |
|---|---|---|
| `space-1` | 8 dp | Gaps internos pequenos |
| `space-2` | 16 dp | Padding lateral do conteúdo, gap entre cards |
| `space-3` | 24 dp | Padding superior do body, margens de bloco |
| Status bar | 16 dp topo | Altura de safe-area superior |
| Bottom Nav | 72 dp | Altura da barra inferior |
| FAB | 56 dp | Diâmetro, com anel branco de 64 dp |
| Touch mínimo | **48 dp** | Botões back, ícones de ação, tabs |

Grid: margem horizontal de **20 dp** nas telas (24 dp em telas de formulário), gap vertical entre seções de **16–24 dp**.

---

## 4. Bordas e Elevação

| Componente | Corner radius | Elevação |
|---|---|---|
| Corpo principal (sheet sobre header) | 28 dp (top) | — |
| Card | 18 dp | sombra `0 4 14` `#1E1B2E0D` |
| Botão primário (CTA/FAB stroke) | 16 dp | sombra `0 6 16` `#7C3AED55` |
| Input / área de texto | 14 dp | — |
| Chip / Tab interno | 14 dp | — |
| Ícone categorizado (tile) | 14–18 dp | — |
| Avatar | 50% (círculo) | — |
| Badge de status | 12 dp | — |

Regra: **não usar strokes rígidas**; hierarquia via preenchimento claro (`page`, `#EDE9FE`) + sombra muito sutil.

---

## 5. Componentes Base

- **Bottom Navigation:** barra branca 72 dp, 4 destinos (Explorar, Agenda, FAB, Carteira, Perfil), item ativo em `primary` com label Semibold.
- **FAB central:** 56 dp, gradiente `fab-start → fab-end` (135°), ícone `add` branco 26 dp, anel branco 64 dp sob o FAB para o "recorte".
- **Card de match/agendamento:** branco, radius 18, padding 14–16, avatar circular colorido + badge `#EDE9FE`.
- **Input:** fundo `page` (`#F6F5FB`), radius 14, padding 14/16, sem borda.
- **Chip selecionado:** fundo `#EDE9FE`, texto `primary`; inativo: fundo `page`, texto `text-secondary`.

---

## 6. Jetpack Compose — Estrutura Inicial de Tema

### `Color.kt`

```kotlin
package br.com.horautil.ui.theme

import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color

val HeaderStart = Color(0xFF7C3AED)
val HeaderEnd = Color(0xFF312E81)
val FabStart = Color(0xFF8B5CF6)
val FabEnd = Color(0xFF6D28D9)
val Primary = Color(0xFF7C3AED)
val PrimaryLight = Color(0xFFA78BFA)
val PrimaryDark = Color(0xFF4C1D95)
val OnHeader = Color(0xFFFFFFFF)
val OnHeaderSub = Color(0xFFDDD6FE)
val Page = Color(0xFFF6F5FB)
val Card = Color(0xFFFFFFFF)
val TextPrimary = Color(0xFF1E1B2E)
val TextSecondary = Color(0xFF8A8FA3)
val ChipActive = Color(0xFFEDE9FE)

val IconRed = Color(0xFFF87171)
val IconAmber = Color(0xFFFBBF24)
val IconGreen = Color(0xFF34D399)
val IconCyan = Color(0xFF22D3EE)
val IconPink = Color(0xFFF472B6)
val IconBlue = Color(0xFF60A5FA)

val HeaderGradient = Brush.linearGradient(listOf(HeaderStart, HeaderEnd))
val FabGradient = Brush.linearGradient(listOf(FabStart, FabEnd))
```

### `Type.kt`

```kotlin
package br.com.horautil.ui.theme

import androidx.compose.material3.Typography
import androidx.compose.ui.text.TextStyle
import androidx.compose.ui.text.font.FontFamily
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.sp

val Inter = FontFamily.SansSerif // substituir por Font(R.font.inter_*)

val HoraUtilTypography = Typography(
    headlineSmall = TextStyle(fontFamily = Inter, fontWeight = FontWeight.Bold, fontSize = 26.sp),
    titleLarge = TextStyle(fontFamily = Inter, fontWeight = FontWeight.Bold, fontSize = 22.sp),
    titleMedium = TextStyle(fontFamily = Inter, fontWeight = FontWeight.Bold, fontSize = 16.sp),
    titleSmall = TextStyle(fontFamily = Inter, fontWeight = FontWeight.Bold, fontSize = 15.sp),
    bodyLarge = TextStyle(fontFamily = Inter, fontWeight = FontWeight.Normal, fontSize = 15.sp),
    bodyMedium = TextStyle(fontFamily = Inter, fontWeight = FontWeight.Normal, fontSize = 14.sp),
    labelLarge = TextStyle(fontFamily = Inter, fontWeight = FontWeight.SemiBold, fontSize = 14.sp),
    labelMedium = TextStyle(fontFamily = Inter, fontWeight = FontWeight.SemiBold, fontSize = 13.sp),
    labelSmall = TextStyle(fontFamily = Inter, fontWeight = FontWeight.Medium, fontSize = 12.sp)
)
```

### `Theme.kt`

```kotlin
package br.com.horautil.ui.theme

import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.lightColorScheme
import androidx.compose.runtime.Composable

private val LightColors = lightColorScheme(
    primary = Primary,
    onPrimary = OnHeader,
    primaryContainer = ChipActive,
    onPrimaryContainer = PrimaryDark,
    background = Page,
    onBackground = TextPrimary,
    surface = Card,
    onSurface = TextPrimary,
    onSurfaceVariant = TextSecondary,
    error = IconRed
)

@Composable
fun HoraUtilTheme(content: @Composable () -> Unit) {
    MaterialTheme(
        colorScheme = LightColors,
        typography = HoraUtilTypography,
        content = content
    )
}
```
