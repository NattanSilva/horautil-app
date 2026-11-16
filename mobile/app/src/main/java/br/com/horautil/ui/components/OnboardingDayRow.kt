package br.com.horautil.ui.components

import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.semantics.Role
import androidx.compose.ui.text.font.FontWeight
import br.com.horautil.domain.model.OnboardingOption
import br.com.horautil.ui.theme.HoraUtilDimens
import br.com.horautil.ui.theme.OnHeader
import br.com.horautil.ui.theme.Page
import br.com.horautil.ui.theme.Primary
import br.com.horautil.ui.theme.TextSecondary

@Composable
fun OnboardingDayRow(
    days: List<OnboardingOption>,
    selectedIds: Set<String>,
    onToggle: (String) -> Unit,
    modifier: Modifier = Modifier,
) {
    Row(
        modifier = modifier.fillMaxWidth(),
        horizontalArrangement = Arrangement.SpaceBetween,
        verticalAlignment = Alignment.CenterVertically,
    ) {
        days.forEach { day ->
            val selected = day.id in selectedIds
            Box(
                modifier = Modifier
                    .size(HoraUtilDimens.OnboardingDaySize)
                    .clip(CircleShape)
                    .background(if (selected) Primary else Page)
                    .clickable(role = Role.Checkbox, onClick = { onToggle(day.id) }),
                contentAlignment = Alignment.Center,
            ) {
                Text(
                    text = day.label,
                    style = MaterialTheme.typography.labelMedium.copy(fontWeight = FontWeight.Bold),
                    color = if (selected) OnHeader else TextSecondary,
                )
            }
        }
    }
}
