package br.com.horautil.ui.screens.agenda

import androidx.annotation.StringRes
import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.navigationBarsPadding
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.statusBarsPadding
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.rounded.EventBusy
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.Icon
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.SnackbarHost
import androidx.compose.material3.SnackbarHostState
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.remember
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.draw.shadow
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.semantics.Role
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.lifecycle.Lifecycle
import androidx.lifecycle.compose.LifecycleEventEffect
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import androidx.lifecycle.viewmodel.compose.viewModel
import br.com.horautil.R
import br.com.horautil.domain.model.Booking
import br.com.horautil.domain.model.BookingStatus
import br.com.horautil.ui.components.BookingStatusBadge
import br.com.horautil.ui.components.HomeBottomBar
import br.com.horautil.ui.components.HomeDestination
import br.com.horautil.ui.components.PaletteIconTile
import br.com.horautil.ui.components.imageVector
import br.com.horautil.ui.theme.CalendarDisabled
import br.com.horautil.ui.theme.Card
import br.com.horautil.ui.theme.ChipActive
import br.com.horautil.ui.theme.HeaderGradient
import br.com.horautil.ui.theme.HoraUtilDimens
import br.com.horautil.ui.theme.IconGreen
import br.com.horautil.ui.theme.IconGreenBg
import br.com.horautil.ui.theme.IconRed
import br.com.horautil.ui.theme.IconRedBg
import br.com.horautil.ui.theme.OnHeader
import br.com.horautil.ui.theme.Page
import br.com.horautil.ui.theme.Primary
import br.com.horautil.ui.theme.TextPrimary
import br.com.horautil.ui.theme.TextSecondary
import br.com.horautil.viewmodel.AgendaFilter
import br.com.horautil.viewmodel.AgendaMessage
import br.com.horautil.viewmodel.AgendaUiState
import br.com.horautil.viewmodel.AgendaViewModel

@Composable
fun AgendaRoute(
    onDestinationSelected: (HomeDestination) -> Unit,
    onFabClick: () -> Unit,
    onReviewClick: (String) -> Unit,
    initialFilter: AgendaFilter = AgendaFilter.ACCEPTED,
    viewModel: AgendaViewModel = viewModel(
        factory = AgendaViewModel.factory(initialFilter),
    ),
) {
    val state by viewModel.uiState.collectAsStateWithLifecycle()
    val snackbarHostState = remember { SnackbarHostState() }
    val errorMessage = stringResource(R.string.schedule_action_failed)

    LifecycleEventEffect(Lifecycle.Event.ON_RESUME) {
        viewModel.refresh()
    }

    LaunchedEffect(state.message) {
        if (state.message == AgendaMessage.ActionFailed) {
            snackbarHostState.showSnackbar(errorMessage)
            viewModel.onMessageShown()
        }
    }

    AgendaScreen(
        state = state,
        snackbarHostState = snackbarHostState,
        onFilterSelected = viewModel::onFilterSelected,
        onAccept = viewModel::accept,
        onDecline = viewModel::decline,
        onCancel = viewModel::cancel,
        onComplete = viewModel::complete,
        onReviewClick = onReviewClick,
        onDestinationSelected = onDestinationSelected,
        onFabClick = onFabClick,
    )
}

@Composable
fun AgendaScreen(
    state: AgendaUiState,
    snackbarHostState: SnackbarHostState,
    onFilterSelected: (AgendaFilter) -> Unit,
    onAccept: (String) -> Unit,
    onDecline: (String) -> Unit,
    onCancel: (String) -> Unit,
    onComplete: (String) -> Unit,
    onReviewClick: (String) -> Unit,
    onDestinationSelected: (HomeDestination) -> Unit,
    onFabClick: () -> Unit,
) {
    Box(
        modifier = Modifier
            .fillMaxSize()
            .background(HeaderGradient),
    ) {
        Column(modifier = Modifier.fillMaxSize()) {
            Text(
                text = stringResource(R.string.schedule_title),
                style = MaterialTheme.typography.titleLarge,
                color = OnHeader,
                modifier = Modifier
                    .statusBarsPadding()
                    .padding(
                        start = HoraUtilDimens.ScheduleHeaderHorizontalPadding,
                        end = HoraUtilDimens.ScheduleHeaderHorizontalPadding,
                        top = HoraUtilDimens.ScheduleHeaderTopPadding,
                        bottom = HoraUtilDimens.ScheduleHeaderBottomPadding,
                    ),
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
                Column(
                    modifier = Modifier
                        .fillMaxSize()
                        .padding(
                            start = HoraUtilDimens.ScheduleBodyHorizontalPadding,
                            end = HoraUtilDimens.ScheduleBodyHorizontalPadding,
                            top = HoraUtilDimens.ScheduleBodyTopPadding,
                            bottom = HoraUtilDimens.ScheduleBodyBottomPadding,
                        ),
                    verticalArrangement = Arrangement.spacedBy(HoraUtilDimens.ScheduleBodyGap),
                ) {
                    FilterTabs(
                        selected = state.selectedFilter,
                        onSelected = onFilterSelected,
                    )

                    if (state.isLoading) {
                        Box(
                            modifier = Modifier.fillMaxSize(),
                            contentAlignment = Alignment.Center,
                        ) {
                            CircularProgressIndicator(
                                color = Primary,
                                strokeWidth = HoraUtilDimens.LoadingIndicatorStroke,
                                modifier = Modifier.size(HoraUtilDimens.LoadingIndicatorSize),
                            )
                        }
                    } else if (state.visibleBookings.isEmpty()) {
                        Box(
                            modifier = Modifier.fillMaxSize(),
                            contentAlignment = Alignment.Center,
                        ) {
                            EmptyState(filter = state.selectedFilter)
                        }
                    } else {
                        Column(
                            modifier = Modifier
                                .weight(1f)
                                .verticalScroll(rememberScrollState()),
                            verticalArrangement = Arrangement.spacedBy(
                                HoraUtilDimens.ScheduleBodyGap,
                            ),
                        ) {
                            state.visibleBookings.forEach { booking ->
                                BookingCard(
                                    booking = booking,
                                    onAccept = { onAccept(booking.id) },
                                    onDecline = { onDecline(booking.id) },
                                    onCancel = { onCancel(booking.id) },
                                    onComplete = { onComplete(booking.id) },
                                    onReview = { onReviewClick(booking.id) },
                                )
                            }
                        }
                    }
                }
            }

            HomeBottomBar(
                selected = HomeDestination.SCHEDULE,
                onDestinationSelected = onDestinationSelected,
                onFabClick = onFabClick,
            )
        }

        SnackbarHost(
            hostState = snackbarHostState,
            modifier = Modifier
                .align(Alignment.BottomCenter)
                .navigationBarsPadding()
                .padding(
                    start = HoraUtilDimens.Space2,
                    end = HoraUtilDimens.Space2,
                    bottom = HoraUtilDimens.HomeBottomNavHeight + HoraUtilDimens.Space2,
                ),
        )
    }
}

@Composable
private fun FilterTabs(
    selected: AgendaFilter,
    onSelected: (AgendaFilter) -> Unit,
) {
    Row(horizontalArrangement = Arrangement.spacedBy(HoraUtilDimens.ScheduleTabsGap)) {
        AgendaFilter.entries.forEach { filter ->
            FilterTab(
                filter = filter,
                selected = filter == selected,
                onClick = { onSelected(filter) },
            )
        }
    }
}

@Composable
private fun FilterTab(
    filter: AgendaFilter,
    selected: Boolean,
    onClick: () -> Unit,
) {
    Box(
        modifier = Modifier
            .clip(RoundedCornerShape(HoraUtilDimens.ScheduleTabCorner))
            .background(if (selected) Primary else Page)
            .clickable(role = Role.Tab, onClick = onClick)
            .padding(
                horizontal = HoraUtilDimens.ScheduleTabHorizontalPadding,
                vertical = HoraUtilDimens.ScheduleTabVerticalPadding,
            ),
    ) {
        Text(
            text = stringResource(filter.labelRes()),
            style = MaterialTheme.typography.labelMedium,
            color = if (selected) OnHeader else TextSecondary,
        )
    }
}

@Composable
private fun BookingCard(
    booking: Booking,
    onAccept: () -> Unit,
    onDecline: () -> Unit,
    onCancel: () -> Unit,
    onComplete: () -> Unit,
    onReview: () -> Unit,
) {
    val shape = RoundedCornerShape(HoraUtilDimens.ScheduleCardCorner)

    Column(
        modifier = Modifier
            .fillMaxWidth()
            .shadow(
                elevation = HoraUtilDimens.ScheduleCardShadowElevation,
                shape = shape,
                ambientColor = TextPrimary.copy(alpha = 0.05f),
                spotColor = TextPrimary.copy(alpha = 0.05f),
            )
            .clip(shape)
            .background(Card)
            .padding(HoraUtilDimens.ScheduleCardPadding),
        verticalArrangement = Arrangement.spacedBy(HoraUtilDimens.ScheduleCardGap),
    ) {
        Row(
            modifier = Modifier.fillMaxWidth(),
            verticalAlignment = Alignment.CenterVertically,
            horizontalArrangement = Arrangement.spacedBy(HoraUtilDimens.ScheduleRowGap),
        ) {
            PaletteIconTile(
                icon = booking.icon.imageVector(),
                palette = booking.palette,
                size = HoraUtilDimens.ScheduleIconTileSize,
                corner = HoraUtilDimens.ScheduleIconTileCorner,
                iconSize = HoraUtilDimens.ScheduleIconSize,
            )
            Column(
                modifier = Modifier.weight(1f),
                verticalArrangement = Arrangement.spacedBy(HoraUtilDimens.ScheduleInfoGap),
            ) {
                Text(
                    text = stringResource(
                        R.string.schedule_card_title,
                        booking.skill,
                        booking.teacherName,
                    ),
                    style = MaterialTheme.typography.titleSmall,
                    color = TextPrimary,
                    maxLines = 1,
                )
                Text(
                    text = stringResource(
                        R.string.schedule_card_meta,
                        booking.dateLabel,
                        booking.timeLabel,
                        booking.durationMinutes,
                    ),
                    style = MaterialTheme.typography.labelSmall.copy(fontWeight = FontWeight.Normal),
                    color = TextSecondary,
                    maxLines = 1,
                )
            }
        }

        Row(
            modifier = Modifier.fillMaxWidth(),
            verticalAlignment = Alignment.CenterVertically,
        ) {
            BookingStatusBadge(status = booking.status)
            Spacer(modifier = Modifier.weight(1f))
            BookingActions(
                booking = booking,
                onAccept = onAccept,
                onDecline = onDecline,
                onCancel = onCancel,
                onComplete = onComplete,
                onReview = onReview,
            )
        }
    }
}

@Composable
private fun BookingActions(
    booking: Booking,
    onAccept: () -> Unit,
    onDecline: () -> Unit,
    onCancel: () -> Unit,
    onComplete: () -> Unit,
    onReview: () -> Unit,
) {
    Row(horizontalArrangement = Arrangement.spacedBy(HoraUtilDimens.Space1)) {
        when (booking.status) {
            BookingStatus.PENDING -> {
                ActionChip(
                    label = stringResource(R.string.schedule_action_accept),
                    background = IconGreenBg,
                    contentColor = IconGreen,
                    onClick = onAccept,
                )
                ActionChip(
                    label = stringResource(R.string.schedule_action_decline),
                    background = IconRedBg,
                    contentColor = IconRed,
                    onClick = onDecline,
                )
            }

            BookingStatus.ACCEPTED -> {
                ActionChip(
                    label = stringResource(R.string.schedule_action_complete),
                    background = IconGreenBg,
                    contentColor = IconGreen,
                    onClick = onComplete,
                )
                ActionChip(
                    label = stringResource(R.string.schedule_action_cancel),
                    background = Page,
                    contentColor = TextSecondary,
                    onClick = onCancel,
                )
            }

            BookingStatus.COMPLETED -> {
                if (booking.reviewed) {
                    ActionChip(
                        label = stringResource(R.string.schedule_action_reviewed),
                        background = Page,
                        contentColor = TextSecondary,
                        onClick = {},
                        enabled = false,
                    )
                } else {
                    ActionChip(
                        label = stringResource(R.string.schedule_action_review),
                        background = ChipActive,
                        contentColor = Primary,
                        onClick = onReview,
                    )
                }
            }

            else -> Unit
        }
    }
}

@Composable
private fun ActionChip(
    label: String,
    background: Color,
    contentColor: Color,
    onClick: () -> Unit,
    enabled: Boolean = true,
) {
    Box(
        modifier = Modifier
            .clip(RoundedCornerShape(HoraUtilDimens.ScheduleBadgeCorner))
            .background(background)
            .clickable(enabled = enabled, role = Role.Button, onClick = onClick)
            .padding(
                horizontal = HoraUtilDimens.ScheduleActionHorizontalPadding,
                vertical = HoraUtilDimens.ScheduleActionVerticalPadding,
            ),
    ) {
        Text(
            text = label,
            style = MaterialTheme.typography.labelSmall.copy(fontWeight = FontWeight.Bold),
            color = contentColor,
        )
    }
}

@Composable
private fun EmptyState(filter: AgendaFilter) {
    Column(
        modifier = Modifier
            .fillMaxWidth()
            .padding(
                start = HoraUtilDimens.ScheduleEmptyHorizontalPadding,
                end = HoraUtilDimens.ScheduleEmptyHorizontalPadding,
                top = HoraUtilDimens.ScheduleEmptyTopPadding,
                bottom = HoraUtilDimens.ScheduleEmptyBottomPadding,
            ),
        horizontalAlignment = Alignment.CenterHorizontally,
        verticalArrangement = Arrangement.spacedBy(HoraUtilDimens.ScheduleEmptyGap),
    ) {
        Icon(
            imageVector = Icons.Rounded.EventBusy,
            contentDescription = null,
            tint = CalendarDisabled,
            modifier = Modifier.size(HoraUtilDimens.ScheduleEmptyIconSize),
        )
        Text(
            text = stringResource(R.string.schedule_empty_title),
            style = MaterialTheme.typography.titleSmall,
            color = TextPrimary,
        )
        Text(
            text = stringResource(filter.emptyMessageRes()),
            style = MaterialTheme.typography.labelSmall.copy(fontWeight = FontWeight.Normal),
            color = TextSecondary,
            textAlign = TextAlign.Center,
        )
    }
}

@StringRes
private fun AgendaFilter.labelRes(): Int = when (this) {
    AgendaFilter.PENDING -> R.string.schedule_tab_pending
    AgendaFilter.ACCEPTED -> R.string.schedule_tab_accepted
    AgendaFilter.COMPLETED -> R.string.schedule_tab_completed
}

@StringRes
private fun AgendaFilter.emptyMessageRes(): Int = when (this) {
    AgendaFilter.PENDING -> R.string.schedule_empty_pending
    AgendaFilter.ACCEPTED -> R.string.schedule_empty_accepted
    AgendaFilter.COMPLETED -> R.string.schedule_empty_completed
}
