package br.com.horautil.ui.components

import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.heightIn
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import br.com.horautil.ui.theme.HoraUtilDimens
import br.com.horautil.ui.theme.Page
import br.com.horautil.ui.theme.TextPrimary

@Composable
fun SocialButton(
    label: String,
    onClick: () -> Unit,
    modifier: Modifier = Modifier,
) {
    Surface(
        onClick = onClick,
        modifier = modifier.heightIn(min = HoraUtilDimens.SocialButtonHeight),
        shape = RoundedCornerShape(HoraUtilDimens.ButtonCornerRadius),
        color = Page,
        contentColor = TextPrimary,
    ) {
        Box(
            modifier = Modifier
                .fillMaxWidth()
                .padding(
                    horizontal = HoraUtilDimens.SocialHorizontalPadding,
                    vertical = HoraUtilDimens.SocialVerticalPadding,
                ),
            contentAlignment = Alignment.Center,
        ) {
            Text(
                text = label,
                style = MaterialTheme.typography.labelLarge,
            )
        }
    }
}
