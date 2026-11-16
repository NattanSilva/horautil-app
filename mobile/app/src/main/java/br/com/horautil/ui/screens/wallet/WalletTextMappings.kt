package br.com.horautil.ui.screens.wallet

import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.rounded.ArrowDownward
import androidx.compose.material.icons.rounded.ArrowUpward
import androidx.compose.material.icons.rounded.Schedule
import androidx.compose.material.icons.rounded.Stars
import androidx.compose.ui.graphics.vector.ImageVector
import br.com.horautil.domain.model.HomePalette
import br.com.horautil.domain.model.WalletEntryType

internal fun WalletEntryType.icon(): ImageVector = when (this) {
    WalletEntryType.GIVEN -> Icons.Rounded.ArrowUpward
    WalletEntryType.RECEIVED -> Icons.Rounded.ArrowDownward
    WalletEntryType.BONUS -> Icons.Rounded.Stars
    WalletEntryType.HELD -> Icons.Rounded.Schedule
}

internal fun WalletEntryType.entryPalette(): HomePalette = when (this) {
    WalletEntryType.GIVEN -> HomePalette.GREEN
    WalletEntryType.RECEIVED -> HomePalette.RED
    WalletEntryType.BONUS -> HomePalette.AMBER
    WalletEntryType.HELD -> HomePalette.AMBER
}

internal fun WalletEntryType.statPalette(): HomePalette = when (this) {
    WalletEntryType.GIVEN -> HomePalette.GREEN
    WalletEntryType.RECEIVED -> HomePalette.BLUE
    WalletEntryType.BONUS -> HomePalette.AMBER
    WalletEntryType.HELD -> HomePalette.AMBER
}
