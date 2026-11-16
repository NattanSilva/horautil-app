package br.com.horautil.ui.screens.teacher

import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.ExperimentalLayoutApi
import androidx.compose.foundation.layout.FlowRow
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
import androidx.compose.material.icons.rounded.ChevronLeft
import androidx.compose.material.icons.rounded.ChevronRight
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
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.semantics.Role
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import androidx.lifecycle.viewmodel.compose.viewModel
import br.com.horautil.R
import br.com.horautil.domain.model.AvailabilityDay
import br.com.horautil.domain.model.TeacherAvailability
import br.com.horautil.domain.model.TeacherDetail
import br.com.horautil.ui.components.HeaderBackButton
import br.com.horautil.ui.components.InitialsAvatar
import br.com.horautil.ui.components.PrimaryButton
import br.com.horautil.ui.theme.CalendarDisabled
import br.com.horautil.ui.theme.Card
import br.com.horautil.ui.theme.ChipActive
import br.com.horautil.ui.theme.HeaderGradient
import br.com.horautil.ui.theme.HoraUtilDimens
import br.com.horautil.ui.theme.HoraUtilHeaderTitle
import br.com.horautil.ui.theme.HoraUtilProfileName
import br.com.horautil.ui.theme.OnHeader
import br.com.horautil.ui.theme.Page
import br.com.horautil.ui.theme.Primary
import br.com.horautil.ui.theme.TextPrimary
import br.com.horautil.ui.theme.TextSecondary
import br.com.horautil.viewmodel.TeacherProfileMessage
import br.com.horautil.viewmodel.TeacherProfileUiState
import br.com.horautil.viewmodel.TeacherProfileViewModel

@Composable
fun TeacherProfileRoute(
    teacherId: String,
    onBack: () -> Unit,
    onBooked: () -> Unit,
    viewModel: TeacherProfileViewModel = viewModel(
        key = "teacher-$teacherId",
        factory = TeacherProfileViewModel.factory(teacherId),
    ),
) {
    val state by viewModel.uiState.collectAsStateWithLifecycle()
    val snackbarHostState = remember { SnackbarHostState() }
    val errorMessage = stringResource(R.string.teacher_booking_failed)

    LaunchedEffect(state.message) {
        if (state.message == TeacherProfileMessage.BookingFailed) {
            snackbarHostState.showSnackbar(errorMessage)
            viewModel.onMessageShown()
        }
    }

    LaunchedEffect(state.bookingSucceeded) {
        if (state.bookingSucceeded) {
            onBooked()
        }
    }

    TeacherProfileScreen(
        state = state,
        snackbarHostState = snackbarHostState,
        onBack = onBack,
        onDaySelected = viewModel::onDaySelected,
        onSlotSelected = viewModel::onSlotSelected,
        onDurationSelected = viewModel::onDurationSelected,
        onBook = viewModel::requestBooking,
    )
}

@Composable
fun TeacherProfileScreen(
    state: TeacherProfileUiState,
    snackbarHostState: SnackbarHostState,
    onBack: () -> Unit,
    onDaySelected: (Int) -> Unit,
    onSlotSelected: (String) -> Unit,
    onDurationSelected: (Int) -> Unit,
    onBook: () -> Unit,
) {
    Box(
        modifier = Modifier
            .fillMaxSize()
            .background(HeaderGradient),
    ) {
        Column(modifier = Modifier.fillMaxSize()) {
            TeacherHeader(
                name = state.detail?.profile?.name.orEmpty(),
                onBack = onBack,
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
                val detail = state.detail
                if (state.isLoading || detail == null) {
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
                } else {
                    Column(modifier = Modifier.fillMaxSize()) {
                        Column(
                            modifier = Modifier
                                .weight(1f)
                                .verticalScroll(rememberScrollState())
                                .padding(
                                    start = HoraUtilDimens.TeacherBodyHorizontalPadding,
                                    end = HoraUtilDimens.TeacherBodyHorizontalPadding,
                                    top = HoraUtilDimens.TeacherBodyTopPadding,
                                    bottom = HoraUtilDimens.TeacherBodyBottomPadding,
                                ),
                            verticalArrangement = Arrangement.spacedBy(HoraUtilDimens.TeacherBodyGap),
                        ) {
                            ProfileHead(detail)
                            BioSection(detail)
                            SkillSection(
                                label = stringResource(R.string.teacher_teaches_label),
                                skills = detail.profile.teaches,
                            )
                            SkillSection(
                                label = stringResource(R.string.teacher_wants_label),
                                skills = detail.profile.wants,
                            )
                            Text(
                                text = stringResource(R.string.teacher_date_title),
                                style = MaterialTheme.typography.titleSmall,
                                color = TextPrimary,
                            )
                            AvailabilityCalendar(
                                availability = detail.availability,
                                selectedDay = state.selectedDay,
                                onDaySelected = onDaySelected,
                            )
                            SlotSelector(
                                availability = detail.availability,
                                selectedSlot = state.selectedSlot,
                                onSlotSelected = onSlotSelected,
                            )
                            DurationSelector(
                                availability = detail.availability,
                                selectedDuration = state.selectedDuration,
                                onDurationSelected = onDurationSelected,
                            )
                        }

                        PrimaryButton(
                            text = stringResource(R.string.teacher_cta),
                            onClick = onBook,
                            enabled = state.canSubmit,
                            loading = state.isSubmitting,
                            modifier = Modifier
                                .navigationBarsPadding()
                                .padding(
                                    start = HoraUtilDimens.TeacherBodyHorizontalPadding,
                                    end = HoraUtilDimens.TeacherBodyHorizontalPadding,
                                    top = HoraUtilDimens.TeacherCtaTopPadding,
                                    bottom = HoraUtilDimens.TeacherBodyBottomPadding,
                                ),
                        )
                    }
                }
            }
        }

        SnackbarHost(
            hostState = snackbarHostState,
            modifier = Modifier
                .align(Alignment.BottomCenter)
                .navigationBarsPadding()
                .padding(
                    start = HoraUtilDimens.Space2,
                    end = HoraUtilDimens.Space2,
                    bottom = HoraUtilDimens.ButtonHeight + HoraUtilDimens.Space3,
                ),
        )
    }
}

@Composable
private fun TeacherHeader(
    name: String,
    onBack: () -> Unit,
) {
    Row(
        modifier = Modifier
            .fillMaxWidth()
            .statusBarsPadding()
            .padding(
                start = HoraUtilDimens.TeacherHeaderHorizontalPadding,
                end = HoraUtilDimens.TeacherHeaderHorizontalPadding,
                top = HoraUtilDimens.TeacherHeaderTopPadding,
                bottom = HoraUtilDimens.TeacherHeaderBottomPadding,
            ),
        verticalAlignment = Alignment.CenterVertically,
        horizontalArrangement = Arrangement.spacedBy(HoraUtilDimens.TeacherHeaderGap),
    ) {
        HeaderBackButton(onClick = onBack)
        Text(
            text = name,
            style = HoraUtilHeaderTitle,
            color = OnHeader,
        )
    }
}

@Composable
private fun ProfileHead(detail: TeacherDetail) {
    Row(
        modifier = Modifier.fillMaxWidth(),
        verticalAlignment = Alignment.CenterVertically,
        horizontalArrangement = Arrangement.spacedBy(HoraUtilDimens.TeacherProfileGap),
    ) {
        InitialsAvatar(
            initials = detail.profile.initials,
            palette = detail.profile.palette,
            size = HoraUtilDimens.TeacherAvatarSize,
            corner = HoraUtilDimens.TeacherAvatarCorner,
            textStyle = HoraUtilHeaderTitle,
        )
        Column(
            verticalArrangement = Arrangement.spacedBy(HoraUtilDimens.TeacherInfoGap),
        ) {
            Text(
                text = detail.profile.name,
                style = HoraUtilProfileName,
                color = TextPrimary,
            )
            Text(
                text = stringResource(
                    R.string.teacher_rating_meta,
                    detail.profile.rating,
                    detail.profile.classesCount,
                    detail.profile.headline,
                ),
                style = MaterialTheme.typography.labelSmall.copy(fontWeight = FontWeight.Normal),
                color = TextSecondary,
            )
        }
    }
}

@Composable
private fun BioSection(detail: TeacherDetail) {
    Column(
        verticalArrangement = Arrangement.spacedBy(HoraUtilDimens.SpaceHalf),
    ) {
        Text(
            text = stringResource(R.string.teacher_bio_title),
            style = MaterialTheme.typography.titleSmall,
            color = TextPrimary,
        )
        Text(
            text = detail.profile.bio,
            style = MaterialTheme.typography.bodySmall,
            color = TextSecondary,
        )
    }
}

@OptIn(ExperimentalLayoutApi::class)
@Composable
private fun SkillSection(
    label: String,
    skills: List<String>,
) {
    Column(verticalArrangement = Arrangement.spacedBy(HoraUtilDimens.SpaceHalf)) {
        Text(
            text = label,
            style = MaterialTheme.typography.labelSmall.copy(fontWeight = FontWeight.SemiBold),
            color = TextSecondary,
        )
        FlowRow(
            horizontalArrangement = Arrangement.spacedBy(HoraUtilDimens.TeacherChipGap),
            verticalArrangement = Arrangement.spacedBy(HoraUtilDimens.TeacherChipGap),
        ) {
            skills.forEach { skill ->
                SkillTag(label = skill)
            }
        }
    }
}

@Composable
private fun SkillTag(label: String) {
    Box(
        modifier = Modifier
            .clip(RoundedCornerShape(HoraUtilDimens.TeacherChipCorner))
            .background(ChipActive)
            .padding(
                horizontal = HoraUtilDimens.TeacherChipHorizontalPadding,
                vertical = HoraUtilDimens.SpaceHalf,
            ),
    ) {
        Text(
            text = label,
            style = MaterialTheme.typography.labelMedium,
            color = Primary,
        )
    }
}

@OptIn(ExperimentalLayoutApi::class)
@Composable
private fun AvailabilityCalendar(
    availability: TeacherAvailability,
    selectedDay: Int?,
    onDaySelected: (Int) -> Unit,
) {
    val shape = RoundedCornerShape(HoraUtilDimens.TeacherCalendarCorner)

    Column(
        modifier = Modifier
            .fillMaxWidth()
            .shadow(
                elevation = HoraUtilDimens.TeacherCalendarShadowElevation,
                shape = shape,
                ambientColor = TextPrimary.copy(alpha = 0.05f),
                spotColor = TextPrimary.copy(alpha = 0.05f),
            )
            .clip(shape)
            .background(Card)
            .padding(HoraUtilDimens.TeacherCalendarPadding),
        verticalArrangement = Arrangement.spacedBy(HoraUtilDimens.TeacherCalendarGap),
    ) {
        Row(
            modifier = Modifier.fillMaxWidth(),
            verticalAlignment = Alignment.CenterVertically,
            horizontalArrangement = Arrangement.SpaceBetween,
        ) {
            CalendarNavButton(
                icon = Icons.Rounded.ChevronLeft,
                description = stringResource(R.string.teacher_previous_month),
            )
            Text(
                text = availability.monthLabel,
                style = MaterialTheme.typography.titleSmall,
                color = TextPrimary,
            )
            CalendarNavButton(
                icon = Icons.Rounded.ChevronRight,
                description = stringResource(R.string.teacher_next_month),
            )
        }

        Row(
            modifier = Modifier.fillMaxWidth(),
            horizontalArrangement = Arrangement.SpaceBetween,
        ) {
            availability.weekdays.forEach { weekday ->
                Box(
                    modifier = Modifier.size(
                        width = HoraUtilDimens.TeacherCalendarDaySize,
                        height = HoraUtilDimens.TeacherCalendarWeekHeight,
                    ),
                    contentAlignment = Alignment.Center,
                ) {
                    Text(
                        text = weekday,
                        style = MaterialTheme.typography.labelSmall.copy(fontWeight = FontWeight.Bold),
                        color = TextSecondary,
                    )
                }
            }
        }

        availability.days.chunked(availability.weekdays.size).forEach { week ->
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
            ) {
                week.forEach { day ->
                    CalendarDay(
                        day = day,
                        selected = day.dayOfMonth == selectedDay,
                        onClick = { onDaySelected(day.dayOfMonth) },
                    )
                }
            }
        }
    }
}

@Composable
private fun CalendarNavButton(
    icon: androidx.compose.ui.graphics.vector.ImageVector,
    description: String,
) {
    Box(
        modifier = Modifier
            .size(HoraUtilDimens.TeacherCalendarNavSize)
            .clip(RoundedCornerShape(HoraUtilDimens.TeacherCalendarNavCorner))
            .background(Page),
        contentAlignment = Alignment.Center,
    ) {
        Icon(
            imageVector = icon,
            contentDescription = description,
            tint = TextPrimary,
            modifier = Modifier.size(HoraUtilDimens.TeacherCalendarNavIconSize),
        )
    }
}

@Composable
private fun CalendarDay(
    day: AvailabilityDay,
    selected: Boolean,
    onClick: () -> Unit,
) {
    val background = when {
        selected -> Primary
        day.isToday -> ChipActive
        else -> Card
    }
    val textColor = when {
        selected -> OnHeader
        day.isToday -> Primary
        day.enabled -> TextPrimary
        else -> CalendarDisabled
    }
    val corner = RoundedCornerShape(HoraUtilDimens.TeacherCalendarDayCorner)

    Box(
        modifier = Modifier
            .size(HoraUtilDimens.TeacherCalendarDaySize)
            .clip(corner)
            .background(background)
            .clickable(
                enabled = day.enabled,
                role = Role.RadioButton,
                onClick = onClick,
            ),
        contentAlignment = Alignment.Center,
    ) {
        Text(
            text = day.dayOfMonth.toString(),
            style = MaterialTheme.typography.bodyMedium.copy(
                fontWeight = if (selected || day.isToday) FontWeight.Bold else FontWeight.Medium,
            ),
            color = textColor,
            textAlign = TextAlign.Center,
        )
    }
}

@OptIn(ExperimentalLayoutApi::class)
@Composable
private fun SlotSelector(
    availability: TeacherAvailability,
    selectedSlot: String?,
    onSlotSelected: (String) -> Unit,
) {
    FlowRow(
        horizontalArrangement = Arrangement.spacedBy(HoraUtilDimens.TeacherChipGap),
        verticalArrangement = Arrangement.spacedBy(HoraUtilDimens.TeacherChipGap),
    ) {
        availability.slots.forEach { slot ->
            SelectorChip(
                label = slot,
                selected = slot == selectedSlot,
                selectedBackground = Primary,
                selectedContent = OnHeader,
                onClick = { onSlotSelected(slot) },
            )
        }
    }
}

@OptIn(ExperimentalLayoutApi::class)
@Composable
private fun DurationSelector(
    availability: TeacherAvailability,
    selectedDuration: Int?,
    onDurationSelected: (Int) -> Unit,
) {
    FlowRow(
        horizontalArrangement = Arrangement.spacedBy(HoraUtilDimens.TeacherChipGap),
        verticalArrangement = Arrangement.spacedBy(HoraUtilDimens.TeacherChipGap),
    ) {
        availability.durations.forEach { duration ->
            SelectorChip(
                label = stringResource(R.string.teacher_duration_format, duration),
                selected = duration == selectedDuration,
                selectedBackground = ChipActive,
                selectedContent = Primary,
                onClick = { onDurationSelected(duration) },
            )
        }
    }
}

@Composable
private fun SelectorChip(
    label: String,
    selected: Boolean,
    selectedBackground: androidx.compose.ui.graphics.Color,
    selectedContent: androidx.compose.ui.graphics.Color,
    onClick: () -> Unit,
) {
    Box(
        modifier = Modifier
            .clip(RoundedCornerShape(HoraUtilDimens.TeacherChipCorner))
            .background(if (selected) selectedBackground else Page)
            .clickable(role = Role.RadioButton, onClick = onClick)
            .padding(
                horizontal = HoraUtilDimens.TeacherChipHorizontalPadding,
                vertical = HoraUtilDimens.TeacherChipVerticalPadding,
            ),
    ) {
        Text(
            text = label,
            style = MaterialTheme.typography.labelLarge,
            color = if (selected) selectedContent else TextSecondary,
        )
    }
}
