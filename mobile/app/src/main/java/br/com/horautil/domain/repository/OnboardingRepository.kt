package br.com.horautil.domain.repository

import br.com.horautil.domain.model.OnboardingOptions
import br.com.horautil.domain.model.OnboardingSelection

interface OnboardingRepository {
    suspend fun getOptions(): Result<OnboardingOptions>
    suspend fun completeOnboarding(selection: OnboardingSelection): Result<Unit>
}
