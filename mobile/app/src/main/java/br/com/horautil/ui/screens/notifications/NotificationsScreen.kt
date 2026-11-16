package br.com.horautil.ui.screens.notifications

import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.statusBarsPadding
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.rounded.CardGiftcard
import androidx.compose.material.icons.rounded.CheckCircle
import androidx.compose.material.icons.rounded.EventAvailable
import androidx.compose.material.icons.rounded.NotificationsNone
import androidx.compose.material.icons.rounded.Star
import androidx.compose.material3.Icon
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.draw.shadow
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.semantics.Role
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.text.style.TextOverflow
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import androidx.lifecycle.viewmodel.compose.viewModel
import br.com.horautil.R
import br.com.horautil.domain.model.AppNotification
import br.com.horautil.domain.model.NotificationAction
import br.com.horautil.domain.model.NotificationType
import br.com.horautil.ui.components.HeaderBackButton
import br.com.horautil.ui.components.colors
import br.com.horautil.ui.theme.Card
import br.com.horautil.ui.theme.ChipActive
import br.com.horautil.ui.theme.HeaderGradient
import br.com.horautil.ui.theme.HoraUtilDimens
import br.com.horautil.ui.theme.HoraUtilHeaderTitle
import br.com.horautil.ui.theme.IconGreen
import br.com.horautil.ui.theme.IconGreenBg
import br.com.horautil.ui.theme.IconRed
import br.com.horautil.ui.theme.IconRedBg
import br.com.horautil.ui.theme.OnHeader
import br.com.horautil.ui.theme.OnHeaderSub
import br.com.horautil.ui.theme.Page
import br.com.horautil.ui.theme.Primary
import br.com.horautil.ui.theme.TextPrimary
import br.com.horautil.ui.theme.TextSecondary
import br.com.horautil.viewmodel.NotificationsViewModel

@Composable
fun NotificationsRoute(
    onBack: () -> Unit,
    onOpenAgenda: (String) -> Unit,
    onOpenWallet: () -> Unit,
    onOpenReview: (String) -> Unit,
    onAcceptRequest: (String) -> Unit,
    onDeclineRequest: (String) -> Unit,
    viewModel: NotificationsViewModel = viewModel(factory = NotificationsViewModel.Factory),
) {
    val state by viewModel.uiState.collectAsStateWithLifecycle()

    NotificationsScreen(
        notifications = state.notifications,
        hasUnread = state.hasUnread,
        onBack = onBack,
        onMarkAllRead = viewModel::markAllAsRead,
        onNotificationClick = { notification ->
            viewModel.markAsRead(notification.id)
            when (notification.action) {
                NotificationAction.OPEN_AGENDA_PENDING -> onOpenAgenda("pending")
                NotificationAction.OPEN_AGENDA_ACCEPTED -> onOpenAgenda("accepted")
                NotificationAction.OPEN_WALLET -> onOpenWallet()
                NotificationAction.OPEN_REVIEW -> notification.bookingId?.let(onOpenReview)
                NotificationAction.NONE -> Unit
            }
        },
        onAccept = { notification ->
            viewModel.markAsRead(notification.id)
            notification.bookingId?.let(onAcceptRequest)
        },
        onDecline = { notification ->
            viewModel.markAsRead(notification.id)
            notification.bookingId?.let(onDeclineRequest)
        },
    )
}

@Composable
fun NotificationsScreen(
    notifications: List<AppNotification>,
    hasUnread: Boolean,
    onBack: () -> Unit,
    onMarkAllRead: () -> Unit,
    onNotificationClick: (AppNotification) -> Unit,
    onAccept: (AppNotification) -> Unit,
    onDecline: (AppNotification) -> Unit,
) {
    Box(
        modifier = Modifier
            .fillMaxSize()
            .background(HeaderGradient),
    ) {
        Column(modifier = Modifier.fillMaxSize()) {
            NotificationsHeader(
                hasUnread = hasUnread,
                onBack = onBack,
                onMarkAllRead = onMarkAllRead,
            )

            Surface(
                modifier = Modifier
                    .weight(1f)
                    .fillMaxWidth(),
                color = Card,
                shape = RoundedCornerShape(
                    topStart = HoraUtilDimens.BodyCornerRadius,
                    topEnd = HoraUtilDimens.BodyCornerRadius,
                ),
            ) {
                if (notifications.isEmpty()) {
                    EmptyNotifications()
                } else {
                    LazyColumn(
                        modifier = Modifier
                            .fillMaxSize()
                            .padding(
                                start = HoraUtilDimens.Space2,
                                end = HoraUtilDimens.Space2,
                                top = HoraUtilDimens.Space3,
                                bottom = HoraUtilDimens.Space3,
                            ),
                        verticalArrangement = Arrangement.spacedBy(HoraUtilDimens.SpaceSmall),
                    ) {
                        items(notifications, key = { it.id }) { notification ->
                            NotificationCard(
                                notification = notification,
                                onClick = { onNotificationClick(notification) },
                                onAccept = { onAccept(notification) },
                                onDecline = { onDecline(notification) },
                            )
                        }
                    }
                }
            }
        }
    }
}

@Composable
private fun NotificationsHeader(
    hasUnread: Boolean,
    onBack: () -> Unit,
    onMarkAllRead: () -> Unit,
) {
    Column(
        modifier = Modifier
            .fillMaxWidth()
            .statusBarsPadding()
            .padding(
                start = HoraUtilDimens.HeaderHorizontalPaddingRegister,
                end = HoraUtilDimens.ScreenHorizontalPadding,
                top = HoraUtilDimens.HeaderTopPaddingRegister,
                bottom = HoraUtilDimens.HeaderBottomPaddingRegister,
            ),
        verticalArrangement = Arrangement.spacedBy(HoraUtilDimens.HeaderGapRegister),
    ) {
        Row(
            modifier = Modifier.fillMaxWidth(),
            verticalAlignment = Alignment.CenterVertically,
        ) {
            HeaderBackButton(onClick = onBack)
            Spacer(modifier = Modifier.width(HoraUtilDimens.Space1))
            Text(
                text = stringResource(R.string.notifications_title),
                style = HoraUtilHeaderTitle,
                color = OnHeader,
                modifier = Modifier.weight(1f),
            )
        }
        if (hasUnread) {
            Text(
                text = stringResource(R.string.notifications_mark_all_read),
                style = MaterialTheme.typography.labelMedium,
                color = OnHeaderSub,
                modifier = Modifier
                    .align(Alignment.End)
                    .clip(RoundedCornerShape(HoraUtilDimens.ScheduleBadgeCorner))
                    .clickable(role = Role.Button, onClick = onMarkAllRead)
                    .padding(
                        horizontal = HoraUtilDimens.Space1,
                        vertical = HoraUtilDimens.SpaceQuarter,
                    ),
            )
        }
    }
}

@Composable
private fun NotificationCard(
    notification: AppNotification,
    onClick: () -> Unit,
    onAccept: () -> Unit,
    onDecline: () -> Unit,
) {
    val shape = RoundedCornerShape(HoraUtilDimens.HomeMatchCardCorner)
    val colors = notification.palette.colors()
    val container = if (notification.isRead) Card else ChipActive.copy(alpha = 0.45f)
    val isRequest = notification.type == NotificationType.LESSON_REQUEST

    Column(
        modifier = Modifier
            .fillMaxWidth()
            .shadow(
                elevation = if (notification.isRead) HoraUtilDimens.WalletEntryShadowElevation else HoraUtilDimens.HomeMatchCardShadowElevation,
                shape = shape,
                ambientColor = TextPrimary.copy(alpha = 0.05f),
                spotColor = TextPrimary.copy(alpha = 0.05f),
            )
            .clip(shape)
            .background(container)
            .clickable(role = Role.Button, onClick = onClick)
            .padding(HoraUtilDimens.HomeMatchCardPadding),
        verticalArrangement = Arrangement.spacedBy(HoraUtilDimens.Space1),
    ) {
        Row(
            modifier = Modifier.fillMaxWidth(),
            verticalAlignment = Alignment.Top,
            horizontalArrangement = Arrangement.spacedBy(HoraUtilDimens.SpaceSmall),
        ) {
            Box(
                modifier = Modifier
                    .size(HoraUtilDimens.ScheduleIconTileSize)
                    .clip(RoundedCornerShape(HoraUtilDimens.ScheduleIconTileCorner))
                    .background(colors.background),
                contentAlignment = Alignment.Center,
            ) {
                Icon(
                    imageVector = when (notification.type) {
                        NotificationType.LESSON_REQUEST -> Icons.Rounded.EventAvailable
                        NotificationType.BOOKING_CONFIRMED -> Icons.Rounded.CheckCircle
                        NotificationType.REVIEW_RECEIVED -> Icons.Rounded.Star
                        NotificationType.CREDIT_RELEASED -> Icons.Rounded.CardGiftcard
                    },
                    contentDescription = null,
                    tint = colors.foreground,
                    modifier = Modifier.size(HoraUtilDimens.ScheduleIconSize),
                )
            }

            Column(
                modifier = Modifier.weight(1f),
                verticalArrangement = Arrangement.spacedBy(HoraUtilDimens.SpaceQuarter),
            ) {
                Text(
                    text = notification.title,
                    style = MaterialTheme.typography.titleSmall,
                    color = TextPrimary,
                    maxLines = 1,
                    overflow = TextOverflow.Ellipsis,
                )
                Text(
                    text = notification.message,
                    style = MaterialTheme.typography.bodySmall,
                    color = TextSecondary,
                )
                Text(
                    text = notification.timeLabel,
                    style = MaterialTheme.typography.labelSmall.copy(fontWeight = FontWeight.Normal),
                    color = TextSecondary,
                )
            }

            if (!notification.isRead) {
                Box(
                    modifier = Modifier
                        .padding(top = HoraUtilDimens.SpaceQuarter)
                        .size(HoraUtilDimens.Space1)
                        .clip(CircleShape)
                        .background(Primary),
                )
            }
        }

        if (isRequest && !notification.isRead) {
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.spacedBy(HoraUtilDimens.Space1, Alignment.End),
            ) {
                ActionPill(
                    label = stringResource(R.string.notifications_action_decline),
                    background = IconRedBg,
                    content = IconRed,
                    onClick = onDecline,
                )
                ActionPill(
                    label = stringResource(R.string.notifications_action_accept),
                    background = IconGreenBg,
                    content = IconGreen,
                    onClick = onAccept,
                )
            }
        } else if (notification.action != NotificationAction.NONE) {
            Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.End) {
                ActionPill(
                    label = stringResource(R.string.notifications_action_open),
                    background = Page,
                    content = Primary,
                    onClick = onClick,
                )
            }
        }
    }
}

@Composable
private fun ActionPill(
    label: String,
    background: Color,
    content: Color,
    onClick: () -> Unit,
) {
    Box(
        modifier = Modifier
            .clip(RoundedCornerShape(HoraUtilDimens.ScheduleBadgeCorner))
            .background(background)
            .clickable(role = Role.Button, onClick = onClick)
            .padding(
                horizontal = HoraUtilDimens.ScheduleActionHorizontalPadding,
                vertical = HoraUtilDimens.ScheduleActionVerticalPadding,
            ),
    ) {
        Text(
            text = label,
            style = MaterialTheme.typography.labelSmall.copy(fontWeight = FontWeight.Bold),
            color = content,
        )
    }
}

@Composable
private fun EmptyNotifications() {
    Column(
        modifier = Modifier
            .fillMaxSize()
            .padding(HoraUtilDimens.Space3),
        horizontalAlignment = Alignment.CenterHorizontally,
        verticalArrangement = Arrangement.spacedBy(HoraUtilDimens.Space1, Alignment.CenterVertically),
    ) {
        Icon(
            imageVector = Icons.Rounded.NotificationsNone,
            contentDescription = null,
            tint = TextSecondary,
            modifier = Modifier.size(HoraUtilDimens.HomeFabSize),
        )
        Text(
            text = stringResource(R.string.notifications_empty_title),
            style = MaterialTheme.typography.titleMedium,
            color = TextPrimary,
        )
        Text(
            text = stringResource(R.string.notifications_empty_subtitle),
            style = MaterialTheme.typography.bodyMedium,
            color = TextSecondary,
            textAlign = TextAlign.Center,
        )
    }
}
