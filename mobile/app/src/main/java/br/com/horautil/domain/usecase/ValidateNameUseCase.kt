package br.com.horautil.domain.usecase

import br.com.horautil.domain.model.AuthFieldError

class ValidateNameUseCase {
    operator fun invoke(value: String): AuthFieldError? {
        val name = value.trim()
        return if (name.length < 3) AuthFieldError.NAME_REQUIRED else null
    }
}
