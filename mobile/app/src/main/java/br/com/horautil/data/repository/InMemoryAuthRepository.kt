package br.com.horautil.data.repository

import br.com.horautil.domain.repository.AuthRepository
import kotlinx.coroutines.delay

class InMemoryAuthRepository : AuthRepository {
    override suspend fun login(email: String, password: String): Result<Unit> {
        delay(700)
        return Result.success(Unit)
    }

    override suspend fun register(
        fullName: String,
        email: String,
        phone: String,
        password: String,
    ): Result<Unit> {
        delay(900)
        return Result.success(Unit)
    }
}
