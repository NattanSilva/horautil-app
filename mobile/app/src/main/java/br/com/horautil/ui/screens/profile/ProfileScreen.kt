package br.com.horautil.ui.screens.profile

import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.ExperimentalLayoutApi
import androidx.compose.foundation.layout.FlowRow
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.statusBarsPadding
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.rounded.AccountBalanceWallet
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.semantics.Role
import androidx.compose.ui.text.font.FontWeight
import androidx.lifecycle.Lifecycle
import androidx.lifecycle.compose.LifecycleEventEffect
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import androidx.lifecycle.viewmodel.compose.viewModel
import br.com.horautil.R
import br.com.horautil.domain.model.HomePalette
import br.com.horautil.domain.model.UserProfile
import br.com.horautil.ui.components.HomeBottomBar
import br.com.horautil.ui.components.HomeDestination
import br.com.horautil.ui.components.InitialsAvatar
import br.com.horautil.ui.components.PaletteIconTile
import br.com.horautil.ui.format.formatHours
import br.com.horautil.ui.theme.Card
import br.com.horautil.ui.theme.ChipActive
import br.com.horautil.ui.theme.HeaderBrand
import br.com.horautil.ui.theme.HeaderGradient
import br.com.horautil.ui.theme.HoraUtilDimens
import br.com.horautil.ui.theme.HoraUtilHeaderTitle
import br.com.horautil.ui.theme.HoraUtilMeta
import br.com.horautil.ui.theme.HoraUtilProfileName
import br.com.horautil.ui.theme.HoraUtilStatValue
import br.com.horautil.ui.theme.OnHeader
import br.com.horautil.ui.theme.OnHeaderSub
import br.com.horautil.ui.theme.Page
import br.com.horautil.ui.theme.Primary
import br.com.horautil.ui.theme.TextPrimary
import br.com.horautil.ui.theme.TextSecondary
import br.com.horautil.viewmodel.ProfileUiState
import br.com.horautil.viewmodel.ProfileViewModel

@Composable
fun ProfileRoute(
    onDestinationSelected: (HomeDestination) -> Unit,
    onFabClick: () -> Unit,
    onWalletClick: () -> Unit,
    viewModel: ProfileViewModel = viewModel(factory = ProfileViewModel.Factory),
) {
    val state by viewModel.uiState.collectAsStateWithLifecycle()

    LifecycleEventEffect(Lifecycle.Event.ON_RESUME) {
        viewModel.refresh()
    }

    ProfileScreen(
        state = state,
        onDestinationSelected = onDestinationSelected,
        onFabClick = onFabClick,
        onWalletClick = onWalletClick,
    )
}

@Composable
fun ProfileScreen(
    state: ProfileUiState,
    onDestinationSelected: (HomeDestination) -> Unit,
    onFabClick: () -> Unit,
    onWalletClick: () -> Unit,
) {
    Box(
        modifier = Modifier
            .fillMaxSize()
            .background(HeaderGradient),
    ) {
        Column(modifier = Modifier.fillMaxSize()) {
            ProfileHeader(profile = state.profile)

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
                val profile = state.profile
                if (state.isLoading || profile == null) {
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
                    ProfileContent(
                        profile = profile,
                        availableHours = state.availableHours,
                        onWalletClick = onWalletClick,
                    )
                }
            }

            HomeBottomBar(
                selected = HomeDestination.PROFILE,
                onDestinationSelected = onDestinationSelected,
                onFabClick = onFabClick,
            )
        }
    }
}

@Composable
private fun ProfileHeader(profile: UserProfile?) {
    Column(
        modifier = Modifier
            .fillMaxWidth()
            .statusBarsPadding()
            .padding(
                start = HoraUtilDimens.ProfileHeaderHorizontalPadding,
                end = HoraUtilDimens.ProfileHeaderHorizontalPadding,
                top = HoraUtilDimens.ProfileHeaderTopPadding,
                bottom = HoraUtilDimens.ProfileHeaderBottomPadding,
            ),
        verticalArrangement = Arrangement.spacedBy(HoraUtilDimens.ProfileHeaderGap),
    ) {
        Text(
            text = stringResource(R.string.profile_title),
            style = HoraUtilHeaderTitle,
            color = OnHeader,
        )

        if (profile != null) {
            Row(
                verticalAlignment = Alignment.CenterVertically,
                horizontalArrangement = Arrangement.spacedBy(HoraUtilDimens.ProfileHeaderGap),
            ) {
                InitialsAvatar(
                    initials = profile.initials,
                    palette = profile.palette,
                    size = HoraUtilDimens.ProfileAvatarSize,
                    corner = HoraUtilDimens.ProfileAvatarCorner,
                )
                Column(
                    verticalArrangement = Arrangement.spacedBy(HoraUtilDimens.ProfileInfoGap),
                ) {
                    Text(
                        text = profile.name,
                        style = HoraUtilProfileName,
                        color = OnHeader,
                    )
                    Text(
                        text = stringResource(
                            R.string.profile_meta,
                            profile.rating,
                            profile.completedLessons,
                        ),
                        style = MaterialTheme.typography.labelSmall.copy(
                            fontWeight = FontWeight.Normal,
                        ),
                        color = OnHeaderSub,
                    )
                    Text(
                        text = stringResource(
                            R.string.profile_member_since,
                            profile.memberSince,
                        ),
                        style = HoraUtilMeta,
                        color = HeaderBrand,
                    )
                }
            }
        }
    }
}

@Composable
private fun ProfileContent(
    profile: UserProfile,
    availableHours: Double,
    onWalletClick: () -> Unit,
) {
    Column(
        modifier = Modifier
            .fillMaxSize()
            .verticalScroll(rememberScrollState())
            .padding(
                start = HoraUtilDimens.ProfileBodyHorizontalPadding,
                end = HoraUtilDimens.ProfileBodyHorizontalPadding,
                top = HoraUtilDimens.ProfileBodyTopPadding,
                bottom = HoraUtilDimens.ProfileBodyBottomPadding,
            ),
        verticalArrangement = Arrangement.spacedBy(HoraUtilDimens.ProfileBodyGap),
    ) {
        BalanceCard(
            availableHours = availableHours,
            onWalletClick = onWalletClick,
        )

        Column(
            verticalArrangement = Arrangement.spacedBy(HoraUtilDimens.ProfileSectionGap),
        ) {
            Text(
                text = stringResource(R.string.profile_about_title),
                style = MaterialTheme.typography.titleSmall,
                color = TextPrimary,
            )
            Text(
                text = profile.bio,
                style = MaterialTheme.typography.bodyMedium,
                color = TextSecondary,
            )
        }

        SkillSection(
            title = stringResource(R.string.profile_teaches_title),
            skills = profile.teaches,
        )
        SkillSection(
            title = stringResource(R.string.profile_wants_title),
            skills = profile.wants,
        )
    }
}

@Composable
private fun BalanceCard(
    availableHours: Double,
    onWalletClick: () -> Unit,
) {
    Row(
        modifier = Modifier
            .fillMaxWidth()
            .clip(RoundedCornerShape(HoraUtilDimens.ProfileBalanceCorner))
            .background(Page)
            .padding(HoraUtilDimens.ProfileBalancePadding),
        verticalAlignment = Alignment.CenterVertically,
        horizontalArrangement = Arrangement.spacedBy(HoraUtilDimens.ProfileBalanceGap),
    ) {
        PaletteIconTile(
            icon = Icons.Rounded.AccountBalanceWallet,
            palette = HomePalette.BLUE,
            size = HoraUtilDimens.WalletEntryIconSize,
            corner = HoraUtilDimens.WalletEntryIconCorner,
            iconSize = HoraUtilDimens.WalletStatIconSize,
        )
        Column(
            modifier = Modifier.weight(1f),
            verticalArrangement = Arrangement.spacedBy(HoraUtilDimens.ProfileInfoGap),
        ) {
            Text(
                text = stringResource(R.string.profile_balance_label),
                style = HoraUtilMeta,
                color = TextSecondary,
            )
            Text(
                text = stringResource(
                    R.string.wallet_balance_value,
                    formatHours(availableHours),
                ),
                style = HoraUtilStatValue,
                color = TextPrimary,
            )
        }
        Box(
            modifier = Modifier
                .clip(RoundedCornerShape(HoraUtilDimens.ProfileChipCorner))
                .background(ChipActive)
                .clickable(role = Role.Button, onClick = onWalletClick)
                .padding(
                    horizontal = HoraUtilDimens.ProfileWalletChipHorizontalPadding,
                    vertical = HoraUtilDimens.ProfileWalletChipVerticalPadding,
                ),
        ) {
            Text(
                text = stringResource(R.string.profile_wallet_action),
                style = MaterialTheme.typography.labelSmall.copy(
                    fontWeight = FontWeight.Bold,
                ),
                color = Primary,
            )
        }
    }
}

@OptIn(ExperimentalLayoutApi::class)
@Composable
private fun SkillSection(
    title: String,
    skills: List<String>,
) {
    if (skills.isEmpty()) return

    Column(verticalArrangement = Arrangement.spacedBy(HoraUtilDimens.ProfileSectionGap)) {
        Text(
            text = title,
            style = MaterialTheme.typography.titleSmall,
            color = TextPrimary,
        )
        FlowRow(
            horizontalArrangement = Arrangement.spacedBy(HoraUtilDimens.ProfileChipGap),
            verticalArrangement = Arrangement.spacedBy(HoraUtilDimens.ProfileChipGap),
        ) {
            skills.forEach { skill ->
                Box(
                    modifier = Modifier
                        .clip(RoundedCornerShape(HoraUtilDimens.ProfileChipCorner))
                        .background(ChipActive)
                        .padding(
                            horizontal = HoraUtilDimens.ProfileChipHorizontalPadding,
                            vertical = HoraUtilDimens.ProfileChipVerticalPadding,
                        ),
                ) {
                    Text(
                        text = skill,
                        style = MaterialTheme.typography.labelMedium.copy(
                            fontWeight = FontWeight.SemiBold,
                        ),
                        color = Primary,
                    )
                }
            }
        }
    }
}
