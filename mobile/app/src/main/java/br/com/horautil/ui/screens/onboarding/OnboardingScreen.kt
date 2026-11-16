package br.com.horautil.ui.screens.onboarding

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.ExperimentalLayoutApi
import androidx.compose.foundation.layout.FlowRow
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.navigationBarsPadding
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material3.CircularProgressIndicator
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
import androidx.compose.ui.res.stringResource
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import androidx.lifecycle.viewmodel.compose.viewModel
import br.com.horautil.R
import br.com.horautil.domain.model.OnboardingOption
import br.com.horautil.ui.components.OnboardingChip
import br.com.horautil.ui.components.OnboardingDayRow
import br.com.horautil.ui.components.OnboardingHeader
import br.com.horautil.ui.components.PrimaryButton
import br.com.horautil.ui.theme.Card
import br.com.horautil.ui.theme.HeaderGradient
import br.com.horautil.ui.theme.HoraUtilDimens
import br.com.horautil.ui.theme.Primary
import br.com.horautil.viewmodel.OnboardingUiState
import br.com.horautil.viewmodel.OnboardingViewModel

@Composable
fun OnboardingRoute(
    onOnboardingComplete: () -> Unit,
    viewModel: OnboardingViewModel = viewModel(factory = OnboardingViewModel.Factory),
) {
    val state by viewModel.uiState.collectAsStateWithLifecycle()
    val snackbarHostState = remember { SnackbarHostState() }
    val errorMessage = stringResource(R.string.onboarding_error)

    LaunchedEffect(state.completed) {
        if (state.completed) {
            onOnboardingComplete()
        }
    }

    LaunchedEffect(state.hasError) {
        if (state.hasError) {
            snackbarHostState.showSnackbar(errorMessage)
            viewModel.onErrorShown()
        }
    }

    OnboardingScreen(
        state = state,
        snackbarHostState = snackbarHostState,
        onTeachToggle = viewModel::onTeachToggle,
        onLearnToggle = viewModel::onLearnToggle,
        onDayToggle = viewModel::onDayToggle,
        onPeriodToggle = viewModel::onPeriodToggle,
        onSubmit = viewModel::complete,
    )
}

@OptIn(ExperimentalLayoutApi::class)
@Composable
fun OnboardingScreen(
    state: OnboardingUiState,
    snackbarHostState: SnackbarHostState,
    onTeachToggle: (String) -> Unit,
    onLearnToggle: (String) -> Unit,
    onDayToggle: (String) -> Unit,
    onPeriodToggle: (String) -> Unit,
    onSubmit: () -> Unit,
) {
    Box(
        modifier = Modifier
            .fillMaxSize()
            .background(HeaderGradient),
    ) {
        Column(modifier = Modifier.fillMaxSize()) {
            OnboardingHeader(
                step = state.step,
                totalSteps = state.totalSteps,
                title = stringResource(R.string.onboarding_title),
                subtitle = stringResource(R.string.onboarding_subtitle),
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
                val options = state.options
                if (options == null) {
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
                    Column(
                        modifier = Modifier
                            .fillMaxSize()
                            .navigationBarsPadding()
                            .padding(
                                start = HoraUtilDimens.OnboardingBodyHorizontalPadding,
                                end = HoraUtilDimens.OnboardingBodyHorizontalPadding,
                                top = HoraUtilDimens.OnboardingBodyTopPadding,
                                bottom = HoraUtilDimens.OnboardingBodyBottomPadding,
                            ),
                    ) {
                        Column(
                            modifier = Modifier
                                .weight(1f)
                                .verticalScroll(rememberScrollState()),
                            verticalArrangement = Arrangement.spacedBy(HoraUtilDimens.OnboardingBodyGap),
                        ) {
                            OnboardingSection(
                                title = stringResource(R.string.onboarding_teach_label),
                            ) {
                                OnboardingChipRow(
                                    options = options.teach,
                                    selectedIds = state.teachIds,
                                    onToggle = onTeachToggle,
                                )
                            }

                            OnboardingSection(
                                title = stringResource(R.string.onboarding_learn_label),
                            ) {
                                OnboardingChipRow(
                                    options = options.learn,
                                    selectedIds = state.learnIds,
                                    onToggle = onLearnToggle,
                                )
                            }

                            OnboardingSection(
                                title = stringResource(R.string.onboarding_availability_label),
                            ) {
                                OnboardingDayRow(
                                    days = options.days,
                                    selectedIds = state.dayIds,
                                    onToggle = onDayToggle,
                                )
                                FlowRow(
                                    horizontalArrangement = Arrangement.spacedBy(
                                        HoraUtilDimens.OnboardingChipGap,
                                    ),
                                    verticalArrangement = Arrangement.spacedBy(
                                        HoraUtilDimens.OnboardingChipGap,
                                    ),
                                ) {
                                    options.periods.forEach { period ->
                                        OnboardingChip(
                                            label = period.label,
                                            selected = period.id in state.periodIds,
                                            onClick = { onPeriodToggle(period.id) },
                                            wide = true,
                                        )
                                    }
                                }
                            }
                        }

                        PrimaryButton(
                            text = stringResource(R.string.onboarding_cta),
                            onClick = onSubmit,
                            enabled = !state.isSubmitting,
                            loading = state.isSubmitting,
                            modifier = Modifier.padding(top = HoraUtilDimens.Space2),
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
                .padding(HoraUtilDimens.Space2),
        )
    }
}

@Composable
private fun OnboardingSection(
    title: String,
    content: @Composable () -> Unit,
) {
    Column(
        verticalArrangement = Arrangement.spacedBy(HoraUtilDimens.OnboardingSectionGap),
    ) {
        Text(
            text = title,
            style = MaterialTheme.typography.titleSmall,
        )
        content()
    }
}

@OptIn(ExperimentalLayoutApi::class)
@Composable
private fun OnboardingChipRow(
    options: List<OnboardingOption>,
    selectedIds: Set<String>,
    onToggle: (String) -> Unit,
) {
    FlowRow(
        horizontalArrangement = Arrangement.spacedBy(HoraUtilDimens.OnboardingChipGap),
        verticalArrangement = Arrangement.spacedBy(HoraUtilDimens.OnboardingChipGap),
    ) {
        options.forEach { option ->
            OnboardingChip(
                label = option.label,
                selected = option.id in selectedIds,
                onClick = { onToggle(option.id) },
            )
        }
    }
}
