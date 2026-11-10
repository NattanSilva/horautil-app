package br.com.horautil.domain.usecase

import br.com.horautil.domain.model.AuthFieldError

class ValidatePhoneUseCase {
    operator fun invoke(value: String): AuthFieldError? {
        if (value.isBlank()) return null

        val digits = value.filter(Char::isDigit)
        return if (digits.length in 10..11) null else AuthFieldError.PHONE_INVALID
    }
}
