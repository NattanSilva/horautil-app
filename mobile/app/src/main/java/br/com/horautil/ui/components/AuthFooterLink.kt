package br.com.horautil.ui.components

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.heightIn
import androidx.compose.foundation.layout.navigationBarsPadding
import androidx.compose.foundation.layout.padding
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp
import br.com.horautil.ui.theme.HoraUtilDimens
import br.com.horautil.ui.theme.Primary
import br.com.horautil.ui.theme.TextSecondary

@Composable
fun AuthFooterLink(
    prefix: String,
    action: String,
    onClick: () -> Unit,
    modifier: Modifier = Modifier,
) {
    Row(
        modifier = modifier
            .fillMaxWidth()
            .navigationBarsPadding()
            .padding(
                horizontal = HoraUtilDimens.ScreenHorizontalPadding,
                vertical = HoraUtilDimens.FooterVerticalPadding,
            ),
        horizontalArrangement = Arrangement.Center,
        verticalAlignment = Alignment.CenterVertically,
    ) {
        Text(
            text = prefix,
            style = MaterialTheme.typography.bodyMedium,
            color = TextSecondary,
        )
        TextButton(
            onClick = onClick,
            modifier = Modifier.heightIn(min = HoraUtilDimens.TouchTarget),
            contentPadding = PaddingValues(horizontal = 8.dp, vertical = 0.dp),
        ) {
            Text(
                text = action,
                style = MaterialTheme.typography.labelLarge,
                color = Primary,
            )
        }
    }
}
