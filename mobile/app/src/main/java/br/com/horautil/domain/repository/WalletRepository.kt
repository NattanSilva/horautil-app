package br.com.horautil.domain.repository

import br.com.horautil.domain.model.WalletSummary

interface WalletRepository {
    suspend fun getSummary(): Result<WalletSummary>
    suspend fun settleLesson(bookingId: String, title: String, hours: Double): Result<Unit>
    suspend fun grantWelcomeBonus(): Result<Unit>
}
