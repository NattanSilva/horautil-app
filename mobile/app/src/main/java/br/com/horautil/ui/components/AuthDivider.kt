package br.com.horautil.ui.components

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.material3.HorizontalDivider
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.font.FontWeight
import br.com.horautil.ui.theme.Divider
import br.com.horautil.ui.theme.HoraUtilDimens
import br.com.horautil.ui.theme.TextSecondary

@Composable
fun AuthDivider(
    text: String,
    modifier: Modifier = Modifier,
) {
    Row(
        modifier = modifier.fillMaxWidth(),
        verticalAlignment = Alignment.CenterVertically,
        horizontalArrangement = Arrangement.spacedBy(HoraUtilDimens.SpaceSmall),
    ) {
        HorizontalDivider(
            modifier = Modifier.weight(1f),
            thickness = HoraUtilDimens.DividerThickness,
            color = Divider,
        )
        Text(
            text = text,
            style = MaterialTheme.typography.labelSmall.copy(fontWeight = FontWeight.Normal),
            color = TextSecondary,
        )
        HorizontalDivider(
            modifier = Modifier.weight(1f),
            thickness = HoraUtilDimens.DividerThickness,
            color = Divider,
        )
    }
}
