package br.com.horautil.ui.theme

import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Shapes
import androidx.compose.material3.lightColorScheme
import androidx.compose.runtime.Composable
import androidx.compose.ui.unit.dp

private val LightColors = lightColorScheme(
    primary = Primary,
    onPrimary = OnHeader,
    primaryContainer = ChipActive,
    onPrimaryContainer = PrimaryDark,
    secondary = PrimaryLight,
    onSecondary = OnHeader,
    background = Page,
    onBackground = TextPrimary,
    surface = Card,
    onSurface = TextPrimary,
    surfaceVariant = Page,
    onSurfaceVariant = TextSecondary,
    outline = Divider,
    error = ErrorText,
    onError = OnHeader,
)

private val HoraUtilShapes = Shapes(
    small = RoundedCornerShape(14.dp),
    medium = RoundedCornerShape(16.dp),
    large = RoundedCornerShape(18.dp),
)

@Composable
fun HoraUtilTheme(content: @Composable () -> Unit) {
    MaterialTheme(
        colorScheme = LightColors,
        typography = HoraUtilTypography,
        shapes = HoraUtilShapes,
        content = content,
    )
}
