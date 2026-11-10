package br.com.horautil.domain.usecase

import br.com.horautil.domain.model.AuthFieldError

class ValidateEmailUseCase {
    private val emailPattern = Regex("^[A-Za-z0-9+_.-]+@[A-Za-z0-9.-]+\\.[A-Za-z]{2,}$")

    operator fun invoke(value: String): AuthFieldError? {
        val email = value.trim()
        return when {
            email.isEmpty() -> AuthFieldError.EMAIL_REQUIRED
            !emailPattern.matches(email) -> AuthFieldError.EMAIL_INVALID
            else -> null
        }
    }
}
