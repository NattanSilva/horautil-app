package br.com.horautil.domain.usecase

import br.com.horautil.domain.model.OnboardingSelection
import br.com.horautil.domain.repository.OnboardingRepository

class CompleteOnboardingUseCase(
    private val repository: OnboardingRepository,
) {
    suspend operator fun invoke(selection: OnboardingSelection): Result<Unit> =
        repository.completeOnboarding(selection)
}
