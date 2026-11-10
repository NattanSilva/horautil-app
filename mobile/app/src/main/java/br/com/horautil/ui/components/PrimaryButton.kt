package br.com.horautil.ui.components

import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.heightIn
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.draw.shadow
import androidx.compose.ui.graphics.SolidColor
import androidx.compose.ui.semantics.Role
import br.com.horautil.ui.theme.CtaGradient
import br.com.horautil.ui.theme.HoraUtilDimens
import br.com.horautil.ui.theme.OnHeader
import br.com.horautil.ui.theme.Primary
import br.com.horautil.ui.theme.TextSecondary

@Composable
fun PrimaryButton(
    text: String,
    onClick: () -> Unit,
    modifier: Modifier = Modifier,
    enabled: Boolean = true,
    loading: Boolean = false,
) {
    val shape = RoundedCornerShape(HoraUtilDimens.ButtonCornerRadius)
    val backgroundBrush = if (enabled && !loading) {
        CtaGradient
    } else {
        SolidColor(TextSecondary.copy(alpha = 0.35f))
    }

    Box(
        modifier = modifier
            .fillMaxWidth()
            .heightIn(min = HoraUtilDimens.ButtonHeight)
            .shadow(
                elevation = HoraUtilDimens.ButtonShadowElevation,
                shape = shape,
                ambientColor = Primary.copy(alpha = 0.35f),
                spotColor = Primary.copy(alpha = 0.35f),
            )
            .clip(shape)
            .background(backgroundBrush)
            .clickable(
                enabled = enabled && !loading,
                role = Role.Button,
                onClick = onClick,
            )
            .padding(
                horizontal = HoraUtilDimens.ButtonHorizontalPadding,
                vertical = HoraUtilDimens.ButtonVerticalPadding,
            ),
        contentAlignment = Alignment.Center,
    ) {
        if (loading) {
            CircularProgressIndicator(
                modifier = Modifier.size(HoraUtilDimens.LoadingIndicatorSize),
                color = OnHeader,
                strokeWidth = HoraUtilDimens.LoadingIndicatorStroke,
            )
        } else {
            Text(
                text = text,
                style = MaterialTheme.typography.titleMedium,
                color = OnHeader,
            )
        }
    }
}
