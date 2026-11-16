package br.com.horautil.domain.usecase

import br.com.horautil.domain.model.Booking
import br.com.horautil.domain.model.BookingRequest
import br.com.horautil.domain.repository.BookingRepository

private const val MIN_DURATION = 30
private const val MAX_DURATION = 180
private const val DURATION_STEP = 30

class RequestBookingUseCase(
    private val repository: BookingRepository,
) {
    suspend operator fun invoke(request: BookingRequest): Result<Booking> {
        if (request.durationMinutes !in MIN_DURATION..MAX_DURATION ||
            request.durationMinutes % DURATION_STEP != 0
        ) {
            return Result.failure(IllegalArgumentException("Duração inválida"))
        }
        if (request.timeLabel.isBlank() || request.dateLabel.isBlank()) {
            return Result.failure(IllegalArgumentException("Data ou horário inválido"))
        }
        return repository.createBooking(request)
    }
}
