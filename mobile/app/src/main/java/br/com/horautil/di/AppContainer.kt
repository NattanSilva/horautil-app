package br.com.horautil.di

import br.com.horautil.data.repository.InMemoryAuthRepository
import br.com.horautil.domain.repository.AuthRepository
import br.com.horautil.domain.usecase.LoginUseCase
import br.com.horautil.domain.usecase.RegisterUseCase
import br.com.horautil.domain.usecase.ValidateEmailUseCase
import br.com.horautil.domain.usecase.ValidateNameUseCase
import br.com.horautil.domain.usecase.ValidatePasswordUseCase
import br.com.horautil.domain.usecase.ValidatePhoneUseCase

object AppContainer {
    private val authRepository: AuthRepository = InMemoryAuthRepository()

    val loginUseCase = LoginUseCase(authRepository)
    val registerUseCase = RegisterUseCase(authRepository)
    val validateNameUseCase = ValidateNameUseCase()
    val validateEmailUseCase = ValidateEmailUseCase()
    val validatePhoneUseCase = ValidatePhoneUseCase()
    val validatePasswordUseCase = ValidatePasswordUseCase()
}
