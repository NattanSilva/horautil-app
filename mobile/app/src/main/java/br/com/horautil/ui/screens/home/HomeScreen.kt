package br.com.horautil.ui.screens.home

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.navigationBarsPadding
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
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
import androidx.compose.ui.text.style.TextAlign
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import androidx.lifecycle.viewmodel.compose.viewModel
import br.com.horautil.R
import br.com.horautil.domain.model.HomeMatch
import br.com.horautil.ui.components.HomeBottomBar
import br.com.horautil.ui.components.HomeCategoryTile
import br.com.horautil.ui.components.HomeDestination
import br.com.horautil.ui.components.HomeHeader
import br.com.horautil.ui.components.HomeSearchBar
import br.com.horautil.ui.components.MatchCard
import br.com.horautil.ui.theme.Card
import br.com.horautil.ui.theme.HeaderGradient
import br.com.horautil.ui.theme.HoraUtilDimens
import br.com.horautil.ui.theme.TextSecondary
import br.com.horautil.viewmodel.HomeUiState
import br.com.horautil.viewmodel.HomeViewModel

@Composable
fun HomeRoute(
    onMatchClick: (String) -> Unit,
    onDestinationSelected: (HomeDestination) -> Unit,
    onFabClick: () -> Unit,
    viewModel: HomeViewModel = viewModel(factory = HomeViewModel.Factory),
) {
    val state by viewModel.uiState.collectAsStateWithLifecycle()
    val snackbarHostState = remember { SnackbarHostState() }
    val messageText = state.message?.toHomeMessageText()

    LaunchedEffect(state.message) {
        if (messageText != null) {
            snackbarHostState.showSnackbar(messageText)
            viewModel.onMessageShown()
        }
    }

    HomeScreen(
        state = state,
        snackbarHostState = snackbarHostState,
        onSearchQueryChange = viewModel::onSearchQueryChange,
        onAvatarClick = viewModel::onComingSoon,
        onNotificationsClick = viewModel::onComingSoon,
        onCategoryClick = viewModel::onComingSoon,
        onMatchClick = { match -> onMatchClick(match.id) },
        onDestinationSelected = onDestinationSelected,
        onFabClick = onFabClick,
    )
}

@Composable
fun HomeScreen(
    state: HomeUiState,
    snackbarHostState: SnackbarHostState,
    onSearchQueryChange: (String) -> Unit,
    onAvatarClick: () -> Unit,
    onNotificationsClick: () -> Unit,
    onCategoryClick: () -> Unit,
    onMatchClick: (HomeMatch) -> Unit,
    onDestinationSelected: (HomeDestination) -> Unit,
    onFabClick: () -> Unit,
) {
    Box(
        modifier = Modifier
            .fillMaxSize()
            .background(HeaderGradient),
    ) {
        Column(modifier = Modifier.fillMaxSize()) {
            HomeHeader(
                greeting = stringResource(R.string.home_greeting, state.userName),
                title = stringResource(R.string.home_title),
                initials = state.userInitials,
                balance = stringResource(R.string.home_balance, state.availableBalance),
                onAvatarClick = onAvatarClick,
                onNotificationsClick = onNotificationsClick,
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
                        .verticalScroll(rememberScrollState())
                        .padding(
                            start = HoraUtilDimens.HomeBodyHorizontalPadding,
                            end = HoraUtilDimens.HomeBodyHorizontalPadding,
                            top = HoraUtilDimens.HomeBodyTopPadding,
                            bottom = HoraUtilDimens.HomeBodyBottomPadding,
                        ),
                    verticalArrangement = Arrangement.spacedBy(HoraUtilDimens.HomeBodyGap),
                ) {
                    HomeSearchBar(
                        value = state.searchQuery,
                        onValueChange = onSearchQueryChange,
                        placeholder = stringResource(R.string.home_search_placeholder),
                    )

                    Text(
                        text = stringResource(R.string.home_categories_title),
                        style = MaterialTheme.typography.titleMedium,
                    )

                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.spacedBy(HoraUtilDimens.HomeCategoryGridGap),
                    ) {
                        state.visibleCategories.forEach { category ->
                            HomeCategoryTile(
                                category = category,
                                onClick = onCategoryClick,
                                modifier = Modifier.weight(1f),
                            )
                        }
                    }

                    Text(
                        text = stringResource(R.string.home_matches_title),
                        style = MaterialTheme.typography.titleMedium,
                    )

                    if (state.visibleMatches.isEmpty()) {
                        Text(
                            text = stringResource(R.string.home_empty_state),
                            style = MaterialTheme.typography.bodyMedium,
                            color = TextSecondary,
                            textAlign = TextAlign.Center,
                            modifier = Modifier
                                .fillMaxWidth()
                                .padding(vertical = HoraUtilDimens.Space3),
                        )
                    } else {
                        state.visibleMatches.forEach { match ->
                            MatchCard(
                                match = match,
                                subtitle = stringResource(
                                    R.string.home_match_subtitle,
                                    match.teaches,
                                    match.wants,
                                ),
                                onClick = { onMatchClick(match) },
                            )
                        }
                    }
                }
            }

            HomeBottomBar(
                selected = HomeDestination.EXPLORE,
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
