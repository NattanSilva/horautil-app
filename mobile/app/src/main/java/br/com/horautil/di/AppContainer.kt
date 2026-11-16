package br.com.horautil.di

import br.com.horautil.data.repository.InMemoryAuthRepository
import br.com.horautil.data.repository.InMemoryHomeRepository
import br.com.horautil.data.repository.InMemoryOnboardingRepository
import br.com.horautil.domain.repository.AuthRepository
import br.com.horautil.domain.repository.HomeRepository
import br.com.horautil.domain.repository.OnboardingRepository
import br.com.horautil.domain.usecase.CompleteOnboardingUseCase
import br.com.horautil.domain.usecase.GetHomeFeedUseCase
import br.com.horautil.domain.usecase.GetOnboardingOptionsUseCase
import br.com.horautil.domain.usecase.LoginUseCase
import br.com.horautil.domain.usecase.RegisterUseCase
import br.com.horautil.domain.usecase.ValidateEmailUseCase
import br.com.horautil.domain.usecase.ValidateNameUseCase
import br.com.horautil.domain.usecase.ValidatePasswordUseCase
import br.com.horautil.domain.usecase.ValidatePhoneUseCase

object AppContainer {
    private val authRepository: AuthRepository = InMemoryAuthRepository()
    private val homeRepository: HomeRepository = InMemoryHomeRepository()
    private val onboardingRepository: OnboardingRepository = InMemoryOnboardingRepository()

    val loginUseCase = LoginUseCase(authRepository)
    val registerUseCase = RegisterUseCase(authRepository)
    val validateNameUseCase = ValidateNameUseCase()
    val validateEmailUseCase = ValidateEmailUseCase()
    val validatePhoneUseCase = ValidatePhoneUseCase()
    val validatePasswordUseCase = ValidatePasswordUseCase()
    val getHomeFeedUseCase = GetHomeFeedUseCase(homeRepository)
    val getOnboardingOptionsUseCase = GetOnboardingOptionsUseCase(onboardingRepository)
    val completeOnboardingUseCase = CompleteOnboardingUseCase(onboardingRepository)
}
