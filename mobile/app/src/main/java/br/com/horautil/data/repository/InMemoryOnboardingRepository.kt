package br.com.horautil.data.repository

import br.com.horautil.domain.model.OnboardingOption
import br.com.horautil.domain.model.OnboardingOptions
import br.com.horautil.domain.model.OnboardingSelection
import br.com.horautil.domain.repository.OnboardingRepository

class InMemoryOnboardingRepository : OnboardingRepository {

    override suspend fun getOptions(): Result<OnboardingOptions> = Result.success(
        OnboardingOptions(
            teach = listOf(
                OnboardingOption(id = "violao", label = "Violão"),
                OnboardingOption(id = "programacao", label = "Programação"),
                OnboardingOption(id = "ingles", label = "Inglês"),
                OnboardingOption(id = "yoga", label = "Yoga"),
            ),
            learn = listOf(
                OnboardingOption(id = "culinaria", label = "Culinária"),
                OnboardingOption(id = "piano", label = "Piano"),
                OnboardingOption(id = "fotografia", label = "Fotografia"),
                OnboardingOption(id = "ingles", label = "Inglês"),
            ),
            days = listOf(
                OnboardingOption(id = "dom", label = "D"),
                OnboardingOption(id = "seg", label = "S"),
                OnboardingOption(id = "ter", label = "T"),
                OnboardingOption(id = "qua", label = "Q"),
                OnboardingOption(id = "qui", label = "Q"),
                OnboardingOption(id = "sex", label = "S"),
                OnboardingOption(id = "sab", label = "S"),
            ),
            periods = listOf(
                OnboardingOption(id = "manha", label = "Manhã"),
                OnboardingOption(id = "tarde", label = "Tarde"),
                OnboardingOption(id = "noite", label = "Noite"),
            ),
            defaultTeachIds = setOf("violao", "programacao", "yoga"),
            defaultLearnIds = setOf("culinaria", "piano", "ingles"),
            defaultDayIds = setOf("seg", "ter", "qua", "sex"),
            defaultPeriodIds = setOf("tarde", "noite"),
        ),
    )

    override suspend fun completeOnboarding(selection: OnboardingSelection): Result<Unit> =
        Result.success(Unit)
}
