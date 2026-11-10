package br.com.horautil.domain.usecase

import br.com.horautil.domain.model.AuthFieldError
import org.junit.Assert.assertEquals
import org.junit.Assert.assertNull
import org.junit.Test

class ValidateNameUseCaseTest {
    private val validate = ValidateNameUseCase()

    @Test
    fun `rejects blank name`() {
        assertEquals(AuthFieldError.NAME_REQUIRED, validate("   "))
    }

    @Test
    fun `rejects name shorter than three characters`() {
        assertEquals(AuthFieldError.NAME_REQUIRED, validate("Jo"))
    }

    @Test
    fun `accepts valid name`() {
        assertNull(validate("Maria Silva"))
    }
}
