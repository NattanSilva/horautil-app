package br.com.horautil.ui.screens.wallet

import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.rounded.ArrowDownward
import androidx.compose.material.icons.rounded.ArrowUpward
import androidx.compose.material.icons.rounded.Schedule
import androidx.compose.material.icons.rounded.Stars
import androidx.compose.ui.graphics.vector.ImageVector
import br.com.horautil.domain.model.HomePalette
import br.com.horautil.domain.model.WalletEntryType
import java.util.Locale
import kotlin.math.abs
import kotlin.math.floor

internal fun formatHours(hours: Double): String {
    val locale = Locale.forLanguageTag("pt-BR")
    return if (hours == floor(hours)) {
        String.format(locale, "%.0f", hours)
    } else {
        String.format(locale, "%.1f", hours)
    }
}

internal fun formatHoursFixed(hours: Double): String =
    String.format(Locale.forLanguageTag("pt-BR"), "%.1f", hours)

internal fun signedHours(hours: Double): String {
    val sign = if (hours >= 0) "+" else "-"
    return sign + formatHours(abs(hours)) + "h"
}

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

