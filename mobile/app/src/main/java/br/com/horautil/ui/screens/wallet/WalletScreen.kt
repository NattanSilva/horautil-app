package br.com.horautil.ui.screens.wallet

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.statusBarsPadding
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.draw.shadow
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextOverflow
import androidx.lifecycle.Lifecycle
import androidx.lifecycle.compose.LifecycleEventEffect
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import androidx.lifecycle.viewmodel.compose.viewModel
import br.com.horautil.R
import br.com.horautil.domain.model.WalletEntry
import br.com.horautil.domain.model.WalletEntryType
import br.com.horautil.domain.model.WalletSummary
import br.com.horautil.ui.components.HomeBottomBar
import br.com.horautil.ui.components.HomeDestination
import br.com.horautil.ui.components.PaletteIconTile
import br.com.horautil.ui.format.formatHours
import br.com.horautil.ui.format.formatHoursFixed
import br.com.horautil.ui.format.signedHours
import br.com.horautil.ui.theme.Card
import br.com.horautil.ui.theme.HeaderBrand
import br.com.horautil.ui.theme.HeaderGradient
import br.com.horautil.ui.theme.HoraUtilBalance
import br.com.horautil.ui.theme.HoraUtilDimens
import br.com.horautil.ui.theme.HoraUtilMeta
import br.com.horautil.ui.theme.HoraUtilStatValue
import br.com.horautil.ui.theme.OnHeader
import br.com.horautil.ui.theme.OnHeaderSub
import br.com.horautil.ui.theme.Page
import br.com.horautil.ui.theme.Primary
import br.com.horautil.ui.theme.TextPrimary
import br.com.horautil.ui.theme.TextSecondary
import br.com.horautil.viewmodel.WalletUiState
import br.com.horautil.viewmodel.WalletViewModel

@Composable
fun WalletRoute(
    onDestinationSelected: (HomeDestination) -> Unit,
    onFabClick: () -> Unit,
    viewModel: WalletViewModel = viewModel(factory = WalletViewModel.Factory),
) {
    val state by viewModel.uiState.collectAsStateWithLifecycle()

    LifecycleEventEffect(Lifecycle.Event.ON_RESUME) {
        viewModel.refresh()
    }

    WalletScreen(
        state = state,
        onDestinationSelected = onDestinationSelected,
        onFabClick = onFabClick,
    )
}

@Composable
fun WalletScreen(
    state: WalletUiState,
    onDestinationSelected: (HomeDestination) -> Unit,
    onFabClick: () -> Unit,
) {
    Box(
        modifier = Modifier
            .fillMaxSize()
            .background(HeaderGradient),
    ) {
        Column(modifier = Modifier.fillMaxSize()) {
            WalletHeader(summary = state.summary)

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
                val summary = state.summary
                if (state.isLoading || summary == null) {
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
                            .verticalScroll(rememberScrollState())
                            .padding(
                                start = HoraUtilDimens.WalletBodyHorizontalPadding,
                                end = HoraUtilDimens.WalletBodyHorizontalPadding,
                                top = HoraUtilDimens.WalletBodyTopPadding,
                                bottom = HoraUtilDimens.WalletBodyBottomPadding,
                            ),
                        verticalArrangement = Arrangement.spacedBy(HoraUtilDimens.WalletBodyGap),
                    ) {
                        WalletStats(summary)
                        Text(
                            text = stringResource(R.string.wallet_statement_title),
                            style = MaterialTheme.typography.titleMedium,
                            color = TextPrimary,
                        )
                        Column(
                            verticalArrangement = Arrangement.spacedBy(HoraUtilDimens.WalletListGap),
                        ) {
                            summary.entries.forEach { entry ->
                                WalletEntryRow(entry)
                            }
                        }
                    }
                }
            }

            HomeBottomBar(
                selected = HomeDestination.WALLET,
                onDestinationSelected = onDestinationSelected,
                onFabClick = onFabClick,
            )
        }
    }
}

@Composable
private fun WalletHeader(summary: WalletSummary?) {
    Column(
        modifier = Modifier
            .fillMaxWidth()
            .statusBarsPadding()
            .padding(
                start = HoraUtilDimens.WalletHeaderHorizontalPadding,
                end = HoraUtilDimens.WalletHeaderHorizontalPadding,
                top = HoraUtilDimens.WalletHeaderTopPadding,
                bottom = HoraUtilDimens.WalletHeaderBottomPadding,
            ),
        horizontalAlignment = Alignment.CenterHorizontally,
        verticalArrangement = Arrangement.spacedBy(HoraUtilDimens.WalletHeaderGap),
    ) {
        Text(
            text = stringResource(R.string.wallet_balance_label),
            style = MaterialTheme.typography.bodySmall,
            color = OnHeaderSub,
        )
        Text(
            text = stringResource(
                R.string.wallet_balance_value,
                formatHours(summary?.availableHours ?: 0.0),
            ),
            style = HoraUtilBalance,
            color = OnHeader,
        )
        Text(
            text = stringResource(
                R.string.wallet_weekly_delta,
                formatHoursFixed(summary?.weeklyDeltaHours ?: 0.0),
            ),
            style = MaterialTheme.typography.labelSmall.copy(fontWeight = FontWeight.SemiBold),
            color = HeaderBrand,
        )
    }
}

@Composable
private fun WalletStats(summary: WalletSummary) {
    Row(
        modifier = Modifier.fillMaxWidth(),
        horizontalArrangement = Arrangement.spacedBy(HoraUtilDimens.WalletStatGap),
    ) {
        WalletStat(
            value = stringResource(
                R.string.wallet_hours_format,
                formatHours(summary.givenHours),
            ),
            label = stringResource(R.string.wallet_stat_given),
            iconType = WalletEntryType.GIVEN,
            modifier = Modifier.weight(1f),
        )
        WalletStat(
            value = stringResource(
                R.string.wallet_hours_format,
                formatHours(summary.receivedHours),
            ),
            label = stringResource(R.string.wallet_stat_received),
            iconType = WalletEntryType.RECEIVED,
            modifier = Modifier.weight(1f),
        )
        WalletStat(
            value = stringResource(
                R.string.wallet_hours_format,
                formatHours(summary.pendingHours),
            ),
            label = stringResource(R.string.wallet_stat_pending),
            iconType = WalletEntryType.HELD,
            modifier = Modifier.weight(1f),
        )
    }
}

@Composable
private fun WalletStat(
    value: String,
    label: String,
    iconType: WalletEntryType,
    modifier: Modifier = Modifier,
) {
    Column(
        modifier = modifier
            .clip(RoundedCornerShape(HoraUtilDimens.WalletStatCorner))
            .background(Page)
            .padding(HoraUtilDimens.WalletStatPadding),
        verticalArrangement = Arrangement.spacedBy(HoraUtilDimens.WalletStatInnerGap),
    ) {
        PaletteIconTile(
            icon = iconType.icon(),
            palette = iconType.statPalette(),
            size = HoraUtilDimens.WalletStatIconBgSize,
            corner = HoraUtilDimens.WalletStatIconBgCorner,
            iconSize = HoraUtilDimens.WalletStatIconSize,
        )
        Text(
            text = value,
            style = HoraUtilStatValue,
            color = TextPrimary,
        )
        Text(
            text = label,
            style = HoraUtilMeta,
            color = TextSecondary,
        )
    }
}

@Composable
private fun WalletEntryRow(entry: WalletEntry) {
    val shape = RoundedCornerShape(HoraUtilDimens.WalletEntryCorner)

    Row(
        modifier = Modifier
            .fillMaxWidth()
            .shadow(
                elevation = HoraUtilDimens.WalletEntryShadowElevation,
                shape = shape,
                ambientColor = TextPrimary.copy(alpha = 0.05f),
                spotColor = TextPrimary.copy(alpha = 0.05f),
            )
            .clip(shape)
            .background(Card)
            .padding(HoraUtilDimens.WalletEntryPadding),
        verticalAlignment = Alignment.CenterVertically,
        horizontalArrangement = Arrangement.spacedBy(HoraUtilDimens.WalletEntryGap),
    ) {
        PaletteIconTile(
            icon = entry.type.icon(),
            palette = entry.type.entryPalette(),
            size = HoraUtilDimens.WalletEntryIconSize,
            corner = HoraUtilDimens.WalletEntryIconCorner,
            iconSize = HoraUtilDimens.WalletEntryIconGlyphSize,
        )
        Column(
            modifier = Modifier.weight(1f),
            verticalArrangement = Arrangement.spacedBy(HoraUtilDimens.WalletEntryInfoGap),
        ) {
            Text(
                text = stringResource(
                    R.string.wallet_entry_title,
                    signedHours(entry.amountHours),
                    entry.title,
                ),
                style = MaterialTheme.typography.labelMedium,
                color = TextPrimary,
                maxLines = 1,
                overflow = TextOverflow.Ellipsis,
            )
            Text(
                text = entry.dateLabel,
                style = HoraUtilMeta,
                color = TextSecondary,
            )
        }
    }
}


