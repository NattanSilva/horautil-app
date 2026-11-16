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
import androidx.compose.foundation.layout.statusBarsPadding
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.rounded.Notifications
import androidx.compose.material3.Icon
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.semantics.Role
import androidx.compose.ui.text.font.FontWeight
import br.com.horautil.R
import br.com.horautil.ui.theme.HeaderAvatarOverlay
import br.com.horautil.ui.theme.HeaderOverlay
import br.com.horautil.ui.theme.HoraUtilCaption
import br.com.horautil.ui.theme.HoraUtilDimens
import br.com.horautil.ui.theme.OnHeader
import br.com.horautil.ui.theme.OnHeaderSub

@Composable
fun HomeHeader(
    greeting: String,
    title: String,
    initials: String,
    balance: String,
    onAvatarClick: () -> Unit,
    onNotificationsClick: () -> Unit,
    modifier: Modifier = Modifier,
    hasUnreadNotifications: Boolean = false,
) {
    Row(
        modifier = modifier
            .fillMaxWidth()
            .statusBarsPadding()
            .padding(
                start = HoraUtilDimens.HomeHeaderHorizontalPadding,
                end = HoraUtilDimens.HomeHeaderHorizontalPadding,
                top = HoraUtilDimens.HomeHeaderTopPadding,
                bottom = HoraUtilDimens.HomeHeaderBottomPadding,
            ),
        verticalAlignment = Alignment.CenterVertically,
    ) {
        Box(
            modifier = Modifier
                .size(HoraUtilDimens.HomeAvatarTouchTarget)
                .clickable(
                    role = Role.Button,
                    onClickLabel = stringResource(R.string.home_open_profile),
                    onClick = onAvatarClick,
                ),
            contentAlignment = Alignment.Center,
        ) {
            Box(
                modifier = Modifier
                    .size(HoraUtilDimens.HomeAvatarSize)
                    .clip(CircleShape)
                    .background(HeaderAvatarOverlay),
                contentAlignment = Alignment.Center,
            ) {
                Text(
                    text = initials,
                    style = MaterialTheme.typography.titleSmall,
                    color = OnHeader,
                )
            }
        }

        Spacer(modifier = Modifier.width(HoraUtilDimens.HomeAvatarGap))

        Column(
            modifier = Modifier.weight(1f),
            verticalArrangement = Arrangement.spacedBy(HoraUtilDimens.HomeHeaderTitlesGap),
        ) {
            Row(
                modifier = Modifier.fillMaxWidth(),
                verticalAlignment = Alignment.CenterVertically,
            ) {
                Text(
                    text = greeting,
                    style = MaterialTheme.typography.labelSmall.copy(fontWeight = FontWeight.Normal),
                    color = OnHeaderSub,
                    maxLines = 1,
                )
                Spacer(modifier = Modifier.weight(1f))
                Box(
                    modifier = Modifier
                        .clip(RoundedCornerShape(HoraUtilDimens.HomeMatchBadgeCorner))
                        .background(HeaderOverlay)
                        .padding(
                            horizontal = HoraUtilDimens.Space1,
                            vertical = HoraUtilDimens.SpaceQuarter,
                        ),
                ) {
                    Text(
                        text = balance,
                        style = HoraUtilCaption,
                        color = OnHeader,
                        maxLines = 1,
                    )
                }
            }
            Text(
                text = title,
                style = MaterialTheme.typography.titleLarge,
                color = OnHeader,
            )
        }

        Spacer(modifier = Modifier.width(HoraUtilDimens.HomeHeaderGap))

        Box(
            modifier = Modifier
                .size(HoraUtilDimens.HomeAvatarTouchTarget)
                .clickable(
                    role = Role.Button,
                    onClickLabel = stringResource(R.string.home_notifications),
                    onClick = onNotificationsClick,
                ),
            contentAlignment = Alignment.Center,
        ) {
            Box(
                modifier = Modifier
                    .size(HoraUtilDimens.HomeBellVisualSize)
                    .clip(CircleShape)
                    .background(HeaderOverlay),
                contentAlignment = Alignment.Center,
            ) {
                Icon(
                    imageVector = Icons.Rounded.Notifications,
                    contentDescription = null,
                    tint = OnHeader,
                    modifier = Modifier.size(HoraUtilDimens.HomeBellIconSize),
                )
            }
            if (hasUnreadNotifications) {
                Box(
                    modifier = Modifier
                        .align(Alignment.TopEnd)
                        .padding(top = HoraUtilDimens.SpaceHalf, end = HoraUtilDimens.SpaceHalf)
                        .size(HoraUtilDimens.Space1)
                        .clip(CircleShape)
                        .background(br.com.horautil.ui.theme.IconRed),
                )
            }
        }
    }
}
