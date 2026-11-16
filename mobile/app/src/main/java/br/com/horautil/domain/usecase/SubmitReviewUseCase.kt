package br.com.horautil.domain.usecase

import br.com.horautil.domain.model.BookingStatus
import br.com.horautil.domain.model.Review
import br.com.horautil.domain.repository.BookingRepository
import br.com.horautil.domain.repository.ReviewRepository
import br.com.horautil.domain.repository.WalletRepository

private const val MIN_RATING = 1
private const val MAX_RATING = 5

class SubmitReviewUseCase(
    private val bookingRepository: BookingRepository,
    private val reviewRepository: ReviewRepository,
    private val walletRepository: WalletRepository,
) {
    suspend operator fun invoke(
        bookingId: String,
        rating: Int,
        comment: String,
    ): Result<Unit> {
        if (rating !in MIN_RATING..MAX_RATING) {
            return Result.failure(IllegalArgumentException("Nota inválida"))
        }

        val booking = bookingRepository.getBooking(bookingId)
            .getOrElse { return Result.failure(it) }

        if (booking.status != BookingStatus.COMPLETED || booking.reviewed) {
            return Result.failure(IllegalStateException("Aula não elegível para avaliação"))
        }

        val review = Review(
            bookingId = bookingId,
            rating = rating,
            comment = comment.trim(),
        )
        reviewRepository.submit(review).getOrElse { return Result.failure(it) }
        bookingRepository.markReviewed(bookingId).getOrElse { return Result.failure(it) }
        walletRepository.settleLesson(
            bookingId = bookingId,
            title = "Aula de ${booking.skill} com ${booking.teacherName}",
            hours = booking.durationMinutes / 60.0,
        ).getOrElse { return Result.failure(it) }
        return Result.success(Unit)
    }
}
