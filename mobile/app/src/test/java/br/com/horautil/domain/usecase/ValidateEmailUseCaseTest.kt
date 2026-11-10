package br.com.horautil.domain.usecase

import br.com.horautil.domain.model.AuthFieldError
import org.junit.Assert.assertEquals
import org.junit.Assert.assertNull
import org.junit.Test

class ValidateEmailUseCaseTest {
    private val validate = ValidateEmailUseCase()

    @Test
    fun `rejects blank email`() {
        assertEquals(AuthFieldError.EMAIL_REQUIRED, validate(" "))
    }

    @Test
    fun `rejects email without at sign`() {
        assertEquals(AuthFieldError.EMAIL_INVALID, validate("maria.silva.com"))
    }

    @Test
    fun `rejects email without domain suffix`() {
        assertEquals(AuthFieldError.EMAIL_INVALID, validate("maria@silva"))
    }

    @Test
    fun `accepts valid email ignoring surrounding spaces`() {
        assertNull(validate("  maria@horautil.com.br  "))
    }
}
