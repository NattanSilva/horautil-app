package br.com.horautil.ui.screens.review

import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.navigationBarsPadding
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.statusBarsPadding
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.text.BasicTextField
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.rounded.Star
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
import androidx.compose.ui.graphics.SolidColor
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.semantics.Role
import androidx.compose.ui.semantics.contentDescription
import androidx.compose.ui.semantics.semantics
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import androidx.lifecycle.viewmodel.compose.viewModel
import br.com.horautil.R
import br.com.horautil.domain.model.Booking
import br.com.horautil.ui.components.InitialsAvatar
import br.com.horautil.ui.components.PrimaryButton
import br.com.horautil.ui.theme.Card
import br.com.horautil.ui.theme.HeaderGradient
import br.com.horautil.ui.theme.HoraUtilDimens
import br.com.horautil.ui.theme.HoraUtilOnboardingTitle
import br.com.horautil.ui.theme.HoraUtilProfileName
import br.com.horautil.ui.theme.OnHeader
import br.com.horautil.ui.theme.OnHeaderSub
import br.com.horautil.ui.theme.Page
import br.com.horautil.ui.theme.Primary
import br.com.horautil.ui.theme.RatingText
import br.com.horautil.ui.theme.StarInactive
import br.com.horautil.ui.theme.TextPrimary
import br.com.horautil.ui.theme.TextSecondary
import br.com.horautil.viewmodel.ReviewMessage
import br.com.horautil.viewmodel.ReviewUiState
import br.com.horautil.viewmodel.ReviewViewModel

@Composable
fun ReviewRoute(
    bookingId: String,
    onReviewSubmitted: () -> Unit,
    viewModel: ReviewViewModel = viewModel(
        factory = ReviewViewModel.factory(bookingId),
    ),
) {
    val state by viewModel.uiState.collectAsStateWithLifecycle()
    val snackbarHostState = remember { SnackbarHostState() }
    val submitFailed = stringResource(R.string.review_submit_failed)
    val loadFailed = stringResource(R.string.review_load_failed)

    LaunchedEffect(state.submitted) {
        if (state.submitted) {
            onReviewSubmitted()
        }
    }

    LaunchedEffect(state.message) {
        val message = state.message ?: return@LaunchedEffect
        snackbarHostState.showSnackbar(
            if (message == ReviewMessage.SubmitFailed) submitFailed else loadFailed,
        )
        viewModel.onMessageShown()
    }

    ReviewScreen(
        state = state,
        snackbarHostState = snackbarHostState,
        onRatingSelected = viewModel::onRatingSelected,
        onCommentChange = viewModel::onCommentChange,
        onSubmit = viewModel::submit,
    )
}

@Composable
fun ReviewScreen(
    state: ReviewUiState,
    snackbarHostState: SnackbarHostState,
    onRatingSelected: (Int) -> Unit,
    onCommentChange: (String) -> Unit,
    onSubmit: () -> Unit,
) {
    Box(
        modifier = Modifier
            .fillMaxSize()
            .background(HeaderGradient),
    ) {
        Column(modifier = Modifier.fillMaxSize()) {
            ReviewHeader(booking = state.booking)

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
                val booking = state.booking
                if (state.isLoading || booking == null) {
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
                    ReviewContent(
                        booking = booking,
                        rating = state.rating,
                        comment = state.comment,
                        isSubmitting = state.isSubmitting,
                        onRatingSelected = onRatingSelected,
                        onCommentChange = onCommentChange,
                        onSubmit = onSubmit,
                    )
                }
            }
        }

        SnackbarHost(
            hostState = snackbarHostState,
            modifier = Modifier
                .align(Alignment.BottomCenter)
                .navigationBarsPadding()
                .padding(HoraUtilDimens.Space2),
        )
    }
}

@Composable
private fun ReviewHeader(booking: Booking?) {
    Column(
        modifier = Modifier
            .fillMaxWidth()
            .statusBarsPadding()
            .padding(
                start = HoraUtilDimens.ReviewHeaderHorizontalPadding,
                end = HoraUtilDimens.ReviewHeaderHorizontalPadding,
                top = HoraUtilDimens.ReviewHeaderTopPadding,
                bottom = HoraUtilDimens.ReviewHeaderBottomPadding,
            ),
        verticalArrangement = Arrangement.spacedBy(HoraUtilDimens.ReviewHeaderGap),
    ) {
        Text(
            text = stringResource(R.string.review_title),
            style = HoraUtilOnboardingTitle,
            color = OnHeader,
        )
        Text(
            text = stringResource(
                R.string.review_subtitle,
                booking?.skill.orEmpty(),
            ),
            style = MaterialTheme.typography.bodySmall,
            color = OnHeaderSub,
        )
    }
}

@Composable
private fun ReviewContent(
    booking: Booking,
    rating: Int,
    comment: String,
    isSubmitting: Boolean,
    onRatingSelected: (Int) -> Unit,
    onCommentChange: (String) -> Unit,
    onSubmit: () -> Unit,
) {
    Column(
        modifier = Modifier
            .fillMaxSize()
            .verticalScroll(rememberScrollState())
            .padding(
                start = HoraUtilDimens.ReviewBodyHorizontalPadding,
                end = HoraUtilDimens.ReviewBodyHorizontalPadding,
                top = HoraUtilDimens.ReviewBodyTopPadding,
                bottom = HoraUtilDimens.ReviewBodyBottomPadding,
            ),
        verticalArrangement = Arrangement.spacedBy(HoraUtilDimens.ReviewBodyGap),
    ) {
        Row(
            verticalAlignment = Alignment.CenterVertically,
            horizontalArrangement = Arrangement.spacedBy(HoraUtilDimens.ReviewTeacherGap),
        ) {
            InitialsAvatar(
                initials = booking.teacherInitials,
                palette = booking.palette,
                size = HoraUtilDimens.ReviewAvatarSize,
                corner = HoraUtilDimens.ReviewAvatarCorner,
            )
            Column(
                verticalArrangement = Arrangement.spacedBy(HoraUtilDimens.ReviewInfoGap),
            ) {
                Text(
                    text = booking.teacherName,
                    style = HoraUtilProfileName,
                    color = TextPrimary,
                )
                Text(
                    text = stringResource(
                        R.string.review_meta,
                        "${booking.dateLabel} ${booking.timeLabel}",
                        booking.durationMinutes,
                    ),
                    style = MaterialTheme.typography.labelSmall.copy(
                        fontWeight = FontWeight.Normal,
                    ),
                    color = TextSecondary,
                )
            }
        }

        Column(
            modifier = Modifier.fillMaxWidth(),
            horizontalAlignment = Alignment.CenterHorizontally,
            verticalArrangement = Arrangement.spacedBy(HoraUtilDimens.Space1),
        ) {
            RatingStars(rating = rating, onRatingSelected = onRatingSelected)
            Text(
                text = stringResource(ratingLabelRes(rating)),
                style = MaterialTheme.typography.labelMedium.copy(
                    fontWeight = FontWeight.Bold,
                ),
                color = RatingText,
            )
        }

        Column(verticalArrangement = Arrangement.spacedBy(HoraUtilDimens.ReviewFeedbackGap)) {
            Text(
                text = stringResource(R.string.review_feedback_label),
                style = MaterialTheme.typography.labelMedium.copy(
                    fontWeight = FontWeight.SemiBold,
                ),
                color = TextPrimary,
            )
            CommentField(
                value = comment,
                onValueChange = onCommentChange,
            )
        }

        PrimaryButton(
            text = stringResource(R.string.review_cta),
            onClick = onSubmit,
            loading = isSubmitting,
            enabled = !isSubmitting,
        )
    }
}

@Composable
private fun RatingStars(
    rating: Int,
    onRatingSelected: (Int) -> Unit,
) {
    Row(horizontalArrangement = Arrangement.spacedBy(HoraUtilDimens.Space1)) {
        (1..5).forEach { index ->
            val description = stringResource(R.string.review_star_description, index)
            Box(
                modifier = Modifier
                    .size(HoraUtilDimens.ReviewStarTouchSize)
                    .semantics { contentDescription = description }
                    .clickable(role = Role.Button) { onRatingSelected(index) },
                contentAlignment = Alignment.Center,
            ) {
                Icon(
                    imageVector = Icons.Rounded.Star,
                    contentDescription = null,
                    tint = if (index <= rating) RatingText else StarInactive,
                    modifier = Modifier.size(HoraUtilDimens.ReviewStarSize),
                )
            }
        }
    }
}

@Composable
private fun CommentField(
    value: String,
    onValueChange: (String) -> Unit,
) {
    BasicTextField(
        value = value,
        onValueChange = onValueChange,
        textStyle = MaterialTheme.typography.bodyMedium.copy(color = TextPrimary),
        cursorBrush = SolidColor(Primary),
        modifier = Modifier
            .fillMaxWidth()
            .height(HoraUtilDimens.ReviewTextAreaHeight),
        decorationBox = { innerTextField ->
            Box(
                modifier = Modifier
                    .fillMaxSize()
                    .clip(RoundedCornerShape(HoraUtilDimens.ReviewTextAreaCorner))
                    .background(Page)
                    .padding(HoraUtilDimens.ReviewTextAreaPadding),
            ) {
                if (value.isEmpty()) {
                    Text(
                        text = stringResource(R.string.review_feedback_placeholder),
                        style = MaterialTheme.typography.bodyMedium,
                        color = TextSecondary,
                        textAlign = TextAlign.Start,
                    )
                }
                innerTextField()
            }
        },
    )
}

private fun ratingLabelRes(rating: Int): Int = when (rating) {
    1 -> R.string.review_rating_1
    2 -> R.string.review_rating_2
    3 -> R.string.review_rating_3
    4 -> R.string.review_rating_4
    else -> R.string.review_rating_5
}
