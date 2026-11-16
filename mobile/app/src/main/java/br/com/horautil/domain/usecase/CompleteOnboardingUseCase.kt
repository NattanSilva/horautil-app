package br.com.horautil.domain.usecase

import br.com.horautil.domain.model.OnboardingSelection
import br.com.horautil.domain.repository.OnboardingRepository
import br.com.horautil.domain.repository.UserProfileRepository
import br.com.horautil.domain.repository.WalletRepository

class CompleteOnboardingUseCase(
    private val repository: OnboardingRepository,
    private val userProfileRepository: UserProfileRepository,
    private val walletRepository: WalletRepository,
) {
    suspend operator fun invoke(selection: OnboardingSelection): Result<Unit> {
        val options = repository.getOptions().getOrElse { return Result.failure(it) }

        val teaches = options.teach
            .filter { it.id in selection.teachIds }
            .map { it.label }
        val wants = options.learn
            .filter { it.id in selection.learnIds }
            .map { it.label }

        userProfileRepository
            .updateSkills(teaches = teaches, wants = wants)
            .getOrElse { return Result.failure(it) }

        walletRepository.grantWelcomeBonus().getOrElse { return Result.failure(it) }

        return repository.completeOnboarding(selection)
    }
}
