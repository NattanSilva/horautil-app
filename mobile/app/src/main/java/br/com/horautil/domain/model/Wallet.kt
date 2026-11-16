package br.com.horautil.domain.model

enum class WalletEntryType {
    GIVEN,
    RECEIVED,
    BONUS,
    HELD,
}

data class WalletEntry(
    val id: String,
    val title: String,
    val dateLabel: String,
    val amountHours: Double,
    val type: WalletEntryType,
)

data class WalletSummary(
    val availableHours: Double,
    val weeklyDeltaHours: Double,
    val givenHours: Double,
    val receivedHours: Double,
    val pendingHours: Double,
    val entries: List<WalletEntry>,
)
