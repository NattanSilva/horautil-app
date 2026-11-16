package br.com.horautil.data.repository

import br.com.horautil.domain.model.Review
import br.com.horautil.domain.repository.ReviewRepository
import kotlinx.coroutines.flow.MutableStateFlow

class InMemoryReviewRepository : ReviewRepository {

    private val reviews = MutableStateFlow<List<Review>>(emptyList())

    override suspend fun submit(review: Review): Result<Unit> {
        if (reviews.value.any { it.bookingId == review.bookingId }) {
            return Result.failure(IllegalStateException("Aula já avaliada"))
        }
        reviews.value = reviews.value + review
        return Result.success(Unit)
    }
}
