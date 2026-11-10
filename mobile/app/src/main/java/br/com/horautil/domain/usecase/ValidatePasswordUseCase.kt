package br.com.horautil.domain.usecase

import br.com.horautil.domain.model.AuthFieldError

class ValidatePasswordUseCase {
    operator fun invoke(value: String): AuthFieldError? {
        return when {
            value.isBlank() -> AuthFieldError.PASSWORD_REQUIRED
            value.length < MIN_LENGTH -> AuthFieldError.PASSWORD_TOO_SHORT
            else -> null
        }
    }

    private companion object {
        const val MIN_LENGTH = 8
    }
}
