package br.com.horautil.ui.components

import androidx.annotation.StringRes
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.rounded.Brush
import androidx.compose.material.icons.rounded.Code
import androidx.compose.material.icons.rounded.MusicNote
import androidx.compose.material.icons.rounded.SelfImprovement
import androidx.compose.material.icons.rounded.SportsTennis
import androidx.compose.material.icons.rounded.Translate
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.text.font.FontWeight
import br.com.horautil.R
import br.com.horautil.domain.model.BookingIcon
import br.com.horautil.domain.model.BookingStatus
import br.com.horautil.ui.theme.HoraUtilDimens
import br.com.horautil.ui.theme.IconAmber
import br.com.horautil.ui.theme.IconAmberBg
import br.com.horautil.ui.theme.IconBlue
import br.com.horautil.ui.theme.IconBlueBg
import br.com.horautil.ui.theme.IconGreen
import br.com.horautil.ui.theme.IconGreenBg
import br.com.horautil.ui.theme.IconRed
import br.com.horautil.ui.theme.IconRedBg
import br.com.horautil.ui.theme.Page
import br.com.horautil.ui.theme.TextSecondary

@StringRes
fun BookingStatus.labelRes(): Int = when (this) {
    BookingStatus.PENDING -> R.string.schedule_status_pending
    BookingStatus.ACCEPTED -> R.string.schedule_status_accepted
    BookingStatus.COMPLETED -> R.string.schedule_status_completed
    BookingStatus.DECLINED -> R.string.schedule_status_declined
    BookingStatus.CANCELLED -> R.string.schedule_status_cancelled
}

private data class StatusColors(val background: Color, val foreground: Color)

private fun BookingStatus.colors(): StatusColors = when (this) {
    BookingStatus.PENDING -> StatusColors(IconAmberBg, IconAmber)
    BookingStatus.ACCEPTED -> StatusColors(IconGreenBg, IconGreen)
    BookingStatus.COMPLETED -> StatusColors(IconBlueBg, IconBlue)
    BookingStatus.DECLINED -> StatusColors(IconRedBg, IconRed)
    BookingStatus.CANCELLED -> StatusColors(Page, TextSecondary)
}

@Composable
fun BookingStatusBadge(
    status: BookingStatus,
    modifier: Modifier = Modifier,
) {
    val colors = status.colors()

    Box(
        modifier = modifier
            .clip(RoundedCornerShape(HoraUtilDimens.ScheduleBadgeCorner))
            .background(colors.background)
            .padding(
                horizontal = HoraUtilDimens.ScheduleBadgeHorizontalPadding,
                vertical = HoraUtilDimens.ScheduleBadgeVerticalPadding,
            ),
    ) {
        Text(
            text = stringResource(status.labelRes()),
            style = MaterialTheme.typography.labelSmall.copy(fontWeight = FontWeight.Bold),
            color = colors.foreground,
        )
    }
}

fun BookingIcon.imageVector(): ImageVector = when (this) {
    BookingIcon.MUSIC -> Icons.Rounded.MusicNote
    BookingIcon.LANGUAGES -> Icons.Rounded.Translate
    BookingIcon.TECH -> Icons.Rounded.Code
    BookingIcon.SPORTS -> Icons.Rounded.SportsTennis
    BookingIcon.YOGA -> Icons.Rounded.SelfImprovement
    BookingIcon.ART -> Icons.Rounded.Brush
}
