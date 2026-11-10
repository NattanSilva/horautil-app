package br.com.horautil.domain.usecase

import br.com.horautil.domain.repository.AuthRepository

class RegisterUseCase(
    private val repository: AuthRepository,
) {
    suspend operator fun invoke(
        fullName: String,
        email: String,
        phone: String,
        password: String,
    ): Result<Unit> {
        return repository.register(
            fullName = fullName.trim(),
            email = email.trim(),
            phone = phone.filter(Char::isDigit),
            password = password,
        )
    }
}
