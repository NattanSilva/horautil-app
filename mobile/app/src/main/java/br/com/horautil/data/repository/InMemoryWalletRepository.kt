package br.com.horautil.data.repository

import br.com.horautil.domain.model.WalletEntry
import br.com.horautil.domain.model.WalletEntryType
import br.com.horautil.domain.model.WalletSummary
import br.com.horautil.domain.repository.WalletRepository
import java.time.LocalDate
import java.time.format.DateTimeFormatter
import kotlinx.coroutines.flow.MutableStateFlow

private const val WELCOME_BONUS_HOURS = 2.0

class InMemoryWalletRepository : WalletRepository {

    private val summary = MutableStateFlow(
        WalletSummary(
            availableHours = 13.0,
            weeklyDeltaHours = 2.5,
            givenHours = 11.0,
            receivedHours = 6.0,
            pendingHours = 1.5,
            entries = listOf(
                WalletEntry(
                    id = "entry-review-bonus-hoje",
                    title = "Bônus de avaliação",
                    dateLabel = "16/11/2026",
                    amountHours = 0.5,
                    type = WalletEntryType.BONUS,
                ),
                WalletEntry(
                    id = "entry-kotlin-received",
                    title = "Aula de Kotlin recebida",
                    dateLabel = "15/11/2026",
                    amountHours = -1.5,
                    type = WalletEntryType.RECEIVED,
                ),
                WalletEntry(
                    id = "entry-yoga-given",
                    title = "Aula de yoga dada",
                    dateLabel = "12/11/2026",
                    amountHours = 1.0,
                    type = WalletEntryType.GIVEN,
                ),
                WalletEntry(
                    id = "entry-fotografia-given",
                    title = "Aula de fotografia dada",
                    dateLabel = "08/11/2026",
                    amountHours = 1.0,
                    type = WalletEntryType.GIVEN,
                ),
                WalletEntry(
                    id = "entry-espanhol-hold",
                    title = "Reserva - Aula de espanhol",
                    dateLabel = "05/11/2026",
                    amountHours = -1.0,
                    type = WalletEntryType.HELD,
                ),
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

    private val settledLessons = mutableSetOf<String>()
    private var welcomeBonusGranted = false

    override suspend fun getSummary(): Result<WalletSummary> = Result.success(summary.value)

    override suspend fun settleLesson(
        bookingId: String,
        title: String,
        hours: Double,
    ): Result<Unit> {
        if (!settledLessons.add(bookingId)) return Result.success(Unit)
        if (hours <= 0) return Result.failure(IllegalArgumentException("Horas inválidas"))

        val entry = WalletEntry(
            id = "lesson-$bookingId",
            title = title,
            dateLabel = today(),
            amountHours = -hours,
            type = WalletEntryType.RECEIVED,
        )
        val current = summary.value
        summary.value = current.copy(
            availableHours = (current.availableHours - hours).coerceAtLeast(0.0),
            receivedHours = current.receivedHours + hours,
            entries = listOf(entry) + current.entries,
        )
        return Result.success(Unit)
    }

    override suspend fun grantWelcomeBonus(): Result<Unit> {
        if (welcomeBonusGranted) return Result.success(Unit)
        welcomeBonusGranted = true

        val bonus = WalletEntry(
            id = "entry-welcome-bonus",
            title = "Bônus de boas-vindas",
            dateLabel = today(),
            amountHours = WELCOME_BONUS_HOURS,
            type = WalletEntryType.BONUS,
        )
        val current = summary.value
        summary.value = current.copy(
            availableHours = current.availableHours + WELCOME_BONUS_HOURS,
            weeklyDeltaHours = current.weeklyDeltaHours + WELCOME_BONUS_HOURS,
            entries = listOf(bonus) + current.entries,
        )
        return Result.success(Unit)
    }

    private fun today(): String =
        LocalDate.now().format(DateTimeFormatter.ofPattern("dd/MM/yyyy"))
}
