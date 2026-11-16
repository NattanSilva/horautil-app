package br.com.horautil.ui.components

import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.draw.shadow
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.semantics.Role
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextOverflow
import br.com.horautil.R
import br.com.horautil.domain.model.HomeMatch
import br.com.horautil.ui.theme.Card
import br.com.horautil.ui.theme.ChipActive
import br.com.horautil.ui.theme.HoraUtilCaption
import br.com.horautil.ui.theme.HoraUtilDimens
import br.com.horautil.ui.theme.Primary
import br.com.horautil.ui.theme.TextPrimary
import br.com.horautil.ui.theme.TextSecondary

@Composable
fun MatchCard(
    match: HomeMatch,
    subtitle: String,
    onClick: () -> Unit,
    modifier: Modifier = Modifier,
) {
    val palette = match.palette.colors()
    val shape = RoundedCornerShape(HoraUtilDimens.HomeMatchCardCorner)

    Row(
        modifier = modifier
            .fillMaxWidth()
            .shadow(
                elevation = HoraUtilDimens.HomeMatchCardShadowElevation,
                shape = shape,
                ambientColor = TextPrimary.copy(alpha = 0.05f),
                spotColor = TextPrimary.copy(alpha = 0.05f),
            )
            .clip(shape)
            .background(Card)
            .clickable(role = Role.Button, onClick = onClick)
            .padding(HoraUtilDimens.HomeMatchCardPadding),
        verticalAlignment = Alignment.CenterVertically,
    ) {
        Box(
            modifier = Modifier
                .size(HoraUtilDimens.HomeMatchAvatarSize)
                .clip(CircleShape)
                .background(palette.background),
            contentAlignment = Alignment.Center,
        ) {
            Text(
                text = match.initials,
                style = MaterialTheme.typography.titleMedium,
                color = palette.foreground,
            )
        }

        Spacer(modifier = Modifier.size(HoraUtilDimens.HomeMatchCardGap))

        Column(
            modifier = Modifier.weight(1f),
            verticalArrangement = Arrangement.spacedBy(HoraUtilDimens.HomeMatchInfoGap),
        ) {
            Text(
                text = match.name,
                style = MaterialTheme.typography.titleSmall,
                color = TextPrimary,
                maxLines = 1,
                overflow = TextOverflow.Ellipsis,
            )
            Text(
                text = subtitle,
                style = MaterialTheme.typography.labelSmall.copy(fontWeight = FontWeight.Normal),
                color = TextSecondary,
                maxLines = 1,
                overflow = TextOverflow.Ellipsis,
            )
            Box(
                modifier = Modifier
                    .clip(RoundedCornerShape(HoraUtilDimens.HomeMatchBadgeCorner))
                    .background(ChipActive)
                    .padding(
                        horizontal = HoraUtilDimens.HomeMatchBadgeHorizontalPadding,
                        vertical = HoraUtilDimens.HomeMatchBadgeVerticalPadding,
                    ),
            ) {
                Text(
                    text = stringResource(R.string.home_match_badge, match.matchPercent),
                    style = HoraUtilCaption,
                    color = Primary,
                )
            }
        }
    }
}
