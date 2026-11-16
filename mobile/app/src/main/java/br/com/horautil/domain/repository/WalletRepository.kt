package br.com.horautil.domain.repository

import br.com.horautil.domain.model.WalletSummary

interface WalletRepository {
    suspend fun getSummary(): Result<WalletSummary>
    suspend fun addReviewBonus(bookingId: String): Result<Unit>
}
