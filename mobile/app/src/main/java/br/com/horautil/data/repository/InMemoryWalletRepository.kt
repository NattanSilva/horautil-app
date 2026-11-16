package br.com.horautil.data.repository

import br.com.horautil.domain.model.WalletEntry
import br.com.horautil.domain.model.WalletEntryType
import br.com.horautil.domain.model.WalletSummary
import br.com.horautil.domain.repository.WalletRepository
import java.time.LocalDate
import java.time.format.DateTimeFormatter
import java.util.Locale
import kotlinx.coroutines.flow.MutableStateFlow

private const val REVIEW_BONUS_HOURS = 0.5

class InMemoryWalletRepository : WalletRepository {

    private val summary = MutableStateFlow(
        WalletSummary(
            availableHours = 12.5,
            weeklyDeltaHours = 2.0,
            givenHours = 8.0,
            receivedHours = 4.5,
            pendingHours = 1.0,
            entries = listOf(
                WalletEntry(
                    id = "entry-violao-given",
                    title = "Aula de violão dada",
                    dateLabel = "02/10/2026",
                    amountHours = 1.0,
                    type = WalletEntryType.GIVEN,
                ),
                WalletEntry(
                    id = "entry-ingles-received",
                    title = "Aula de inglês recebida",
                    dateLabel = "28/09/2026",
                    amountHours = -1.0,
                    type = WalletEntryType.RECEIVED,
                ),
                WalletEntry(
                    id = "entry-review-bonus",
                    title = "Bônus de avaliação",
                    dateLabel = "25/09/2026",
                    amountHours = 0.5,
                    type = WalletEntryType.BONUS,
                ),
            ),
        ),
    )

    private val reviewBonuses = mutableSetOf<String>()

    override suspend fun getSummary(): Result<WalletSummary> = Result.success(summary.value)

    override suspend fun addReviewBonus(bookingId: String): Result<Unit> {
        if (!reviewBonuses.add(bookingId)) return Result.success(Unit)

        val today = LocalDate.now().format(DateTimeFormatter.ofPattern("dd/MM/yyyy"))
        val bonus = WalletEntry(
            id = "bonus-$bookingId",
            title = "Bônus de avaliação",
            dateLabel = today,
            amountHours = REVIEW_BONUS_HOURS,
            type = WalletEntryType.BONUS,
        )
        val current = summary.value
        summary.value = current.copy(
            availableHours = current.availableHours + REVIEW_BONUS_HOURS,
            entries = listOf(bonus) + current.entries,
        )
        return Result.success(Unit)
    }
}
