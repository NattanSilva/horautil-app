package br.com.horautil.domain.repository

interface AuthRepository {
    suspend fun login(email: String, password: String): Result<Unit>

    suspend fun register(
        fullName: String,
        email: String,
        phone: String,
        password: String,
    ): Result<Unit>
}
