package br.com.horautil.domain.usecase

import br.com.horautil.domain.model.OnboardingOptions
import br.com.horautil.domain.repository.OnboardingRepository

class GetOnboardingOptionsUseCase(
    private val repository: OnboardingRepository,
) {
    suspend operator fun invoke(): Result<OnboardingOptions> = repository.getOptions()
}
