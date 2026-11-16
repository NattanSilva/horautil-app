package br.com.horautil.ui.components

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.Icon
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.unit.Dp
import br.com.horautil.domain.model.HomePalette

@Composable
fun PaletteIconTile(
    icon: ImageVector,
    palette: HomePalette,
    size: Dp,
    corner: Dp,
    iconSize: Dp,
    modifier: Modifier = Modifier,
) {
    val colors = palette.colors()

    Box(
        modifier = modifier
            .size(size)
            .clip(RoundedCornerShape(corner))
            .background(colors.background),
        contentAlignment = Alignment.Center,
    ) {
        Icon(
            imageVector = icon,
            contentDescription = null,
            tint = colors.foreground,
            modifier = Modifier.size(iconSize),
        )
    }
}
