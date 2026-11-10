package br.com.horautil.domain.usecase

import br.com.horautil.domain.model.AuthFieldError
import org.junit.Assert.assertEquals
import org.junit.Assert.assertNull
import org.junit.Test

class ValidatePasswordUseCaseTest {
    private val validate = ValidatePasswordUseCase()

    @Test
    fun `rejects blank password`() {
        assertEquals(AuthFieldError.PASSWORD_REQUIRED, validate("   "))
    }

    @Test
    fun `rejects password shorter than eight characters`() {
        assertEquals(AuthFieldError.PASSWORD_TOO_SHORT, validate("1234567"))
    }

    @Test
    fun `accepts password with eight characters`() {
        assertNull(validate("12345678"))
    }
}
