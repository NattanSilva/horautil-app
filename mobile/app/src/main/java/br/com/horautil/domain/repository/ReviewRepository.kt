package br.com.horautil.domain.repository

import br.com.horautil.domain.model.Review

interface ReviewRepository {
    suspend fun submit(review: Review): Result<Unit>
}
