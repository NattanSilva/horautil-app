package br.com.horautil.domain.usecase

import br.com.horautil.domain.repository.AuthRepository

class LoginUseCase(
    private val repository: AuthRepository,
) {
    suspend operator fun invoke(email: String, password: String): Result<Unit> {
        return repository.login(email = email.trim(), password = password)
    }
}
