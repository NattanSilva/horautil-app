package br.com.horautil.domain.usecase

import br.com.horautil.domain.model.WalletSummary
import br.com.horautil.domain.repository.WalletRepository

class GetWalletSummaryUseCase(
    private val repository: WalletRepository,
) {
    suspend operator fun invoke(): Result<WalletSummary> = repository.getSummary()
}
