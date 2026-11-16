package br.com.horautil.ui.components

import androidx.annotation.StringRes
import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.navigationBarsPadding
import androidx.compose.foundation.layout.offset
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.rounded.EventNote
import androidx.compose.material.icons.rounded.AccountBalanceWallet
import androidx.compose.material.icons.rounded.Add
import androidx.compose.material.icons.rounded.Explore
import androidx.compose.material.icons.rounded.Person
import androidx.compose.material3.Icon
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.draw.shadow
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.semantics.Role
import androidx.compose.ui.text.font.FontWeight
import br.com.horautil.R
import br.com.horautil.ui.theme.Card
import br.com.horautil.ui.theme.FabGradient
import br.com.horautil.ui.theme.HoraUtilCaption
import br.com.horautil.ui.theme.HoraUtilDimens
import br.com.horautil.ui.theme.OnHeader
import br.com.horautil.ui.theme.Primary
import br.com.horautil.ui.theme.TextSecondary

enum class HomeDestination(
    @StringRes val labelRes: Int,
    val icon: ImageVector,
) {
    EXPLORE(R.string.nav_explore, Icons.Rounded.Explore),
    SCHEDULE(R.string.nav_schedule, Icons.AutoMirrored.Rounded.EventNote),
    WALLET(R.string.nav_wallet, Icons.Rounded.AccountBalanceWallet),
    PROFILE(R.string.nav_profile, Icons.Rounded.Person),
}

@Composable
fun HomeBottomBar(
    selected: HomeDestination,
    onDestinationSelected: (HomeDestination) -> Unit,
    onFabClick: () -> Unit,
    modifier: Modifier = Modifier,
) {
    Box(
        modifier = modifier
            .fillMaxWidth()
            .background(Card),
    ) {
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .navigationBarsPadding()
                .height(HoraUtilDimens.HomeBottomNavHeight)
                .padding(horizontal = HoraUtilDimens.HomeBottomNavHorizontalPadding),
            verticalAlignment = Alignment.CenterVertically,
        ) {
            HomeTab(
                destination = HomeDestination.EXPLORE,
                selected = selected == HomeDestination.EXPLORE,
                onClick = { onDestinationSelected(HomeDestination.EXPLORE) },
                modifier = Modifier.weight(1f),
            )
            HomeTab(
                destination = HomeDestination.SCHEDULE,
                selected = selected == HomeDestination.SCHEDULE,
                onClick = { onDestinationSelected(HomeDestination.SCHEDULE) },
                modifier = Modifier.weight(1f),
            )

            Spacer(modifier = Modifier.width(HoraUtilDimens.HomeFabSpace))

            HomeTab(
                destination = HomeDestination.WALLET,
                selected = selected == HomeDestination.WALLET,
                onClick = { onDestinationSelected(HomeDestination.WALLET) },
                modifier = Modifier.weight(1f),
            )
            HomeTab(
                destination = HomeDestination.PROFILE,
                selected = selected == HomeDestination.PROFILE,
                onClick = { onDestinationSelected(HomeDestination.PROFILE) },
                modifier = Modifier.weight(1f),
            )
        }

        Box(
            modifier = Modifier
                .align(Alignment.TopCenter)
                .offset(y = HoraUtilDimens.HomeFabRingOffset)
                .size(HoraUtilDimens.HomeFabRingSize)
                .background(Card, CircleShape),
        )

        Box(
            modifier = Modifier
                .align(Alignment.TopCenter)
                .offset(y = HoraUtilDimens.HomeFabOffset)
                .size(HoraUtilDimens.HomeFabSize)
                .shadow(
                    elevation = HoraUtilDimens.HomeFabShadowElevation,
                    shape = CircleShape,
                    ambientColor = Primary.copy(alpha = 0.4f),
                    spotColor = Primary.copy(alpha = 0.4f),
                )
                .clip(CircleShape)
                .background(FabGradient)
                .clickable(
                    role = Role.Button,
                    onClickLabel = stringResource(R.string.home_new_session),
                    onClick = onFabClick,
                ),
            contentAlignment = Alignment.Center,
        ) {
            Icon(
                imageVector = Icons.Rounded.Add,
                contentDescription = null,
                tint = OnHeader,
                modifier = Modifier.size(HoraUtilDimens.HomeFabIconSize),
            )
        }
    }
}

@Composable
private fun HomeTab(
    destination: HomeDestination,
    selected: Boolean,
    onClick: () -> Unit,
    modifier: Modifier = Modifier,
) {
    val tint = if (selected) Primary else TextSecondary

    Column(
        modifier = modifier
            .clickable(role = Role.Button, onClick = onClick)
            .padding(vertical = HoraUtilDimens.HomeBottomNavTabPadding),
        horizontalAlignment = Alignment.CenterHorizontally,
        verticalArrangement = Arrangement.spacedBy(HoraUtilDimens.HomeBottomNavTabGap),
    ) {
        Icon(
            imageVector = destination.icon,
            contentDescription = null,
            tint = tint,
            modifier = Modifier.size(HoraUtilDimens.HomeBottomNavIconSize),
        )
        Text(
            text = stringResource(destination.labelRes),
            style = HoraUtilCaption.copy(
                fontWeight = if (selected) FontWeight.Bold else FontWeight.Medium,
            ),
            color = tint,
            maxLines = 1,
        )
    }
}
