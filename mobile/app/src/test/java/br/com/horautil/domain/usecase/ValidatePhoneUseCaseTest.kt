package br.com.horautil.domain.usecase

import br.com.horautil.domain.model.AuthFieldError
import org.junit.Assert.assertEquals
import org.junit.Assert.assertNull
import org.junit.Test

class ValidatePhoneUseCaseTest {
    private val validate = ValidatePhoneUseCase()

    @Test
    fun `accepts empty phone`() {
        assertNull(validate(""))
    }

    @Test
    fun `accepts ten digit phone`() {
        assertNull(validate("1133334444"))
    }

    @Test
    fun `accepts formatted eleven digit phone`() {
        assertNull(validate("(11) 99999-0000"))
    }

    @Test
    fun `rejects phone with invalid length`() {
        assertEquals(AuthFieldError.PHONE_INVALID, validate("99999"))
    }
}
