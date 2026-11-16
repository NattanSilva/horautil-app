package br.com.horautil.ui.components

import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.semantics.Role
import br.com.horautil.ui.theme.ChipActive
import br.com.horautil.ui.theme.HoraUtilDimens
import br.com.horautil.ui.theme.Page
import br.com.horautil.ui.theme.Primary
import br.com.horautil.ui.theme.TextSecondary

@Composable
fun OnboardingChip(
    label: String,
    selected: Boolean,
    onClick: () -> Unit,
    modifier: Modifier = Modifier,
    wide: Boolean = false,
) {
    Box(
        modifier = modifier
            .height(HoraUtilDimens.OnboardingChipHeight)
            .clip(RoundedCornerShape(HoraUtilDimens.OnboardingChipCorner))
            .background(if (selected) ChipActive else Page)
            .clickable(role = Role.Checkbox, onClick = onClick)
            .padding(
                horizontal = if (wide) {
                    HoraUtilDimens.OnboardingChipPeriodHorizontalPadding
                } else {
                    HoraUtilDimens.OnboardingChipHorizontalPadding
                },
                vertical = HoraUtilDimens.OnboardingChipVerticalPadding,
            ),
        contentAlignment = Alignment.Center,
    ) {
        Text(
            text = label,
            style = MaterialTheme.typography.labelMedium,
            color = if (selected) Primary else TextSecondary,
            maxLines = 1,
        )
    }
}
