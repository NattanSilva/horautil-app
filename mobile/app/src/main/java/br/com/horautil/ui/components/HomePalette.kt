package br.com.horautil.ui.components

import androidx.compose.ui.graphics.Color
import br.com.horautil.domain.model.HomePalette
import br.com.horautil.ui.theme.IconAmber
import br.com.horautil.ui.theme.IconAmberBg
import br.com.horautil.ui.theme.IconBlue
import br.com.horautil.ui.theme.IconBlueBg
import br.com.horautil.ui.theme.IconCyan
import br.com.horautil.ui.theme.IconCyanBg
import br.com.horautil.ui.theme.IconGreen
import br.com.horautil.ui.theme.IconGreenBg
import br.com.horautil.ui.theme.IconPink
import br.com.horautil.ui.theme.IconPinkBg
import br.com.horautil.ui.theme.IconRed
import br.com.horautil.ui.theme.IconRedBg

internal data class HomePaletteColors(
    val foreground: Color,
    val background: Color,
)

internal fun HomePalette.colors(): HomePaletteColors = when (this) {
    HomePalette.RED -> HomePaletteColors(IconRed, IconRedBg)
    HomePalette.AMBER -> HomePaletteColors(IconAmber, IconAmberBg)
    HomePalette.GREEN -> HomePaletteColors(IconGreen, IconGreenBg)
    HomePalette.CYAN -> HomePaletteColors(IconCyan, IconCyanBg)
    HomePalette.PINK -> HomePaletteColors(IconPink, IconPinkBg)
    HomePalette.BLUE -> HomePaletteColors(IconBlue, IconBlueBg)
}
