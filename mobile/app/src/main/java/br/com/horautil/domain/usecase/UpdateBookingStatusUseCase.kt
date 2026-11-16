package br.com.horautil.domain.usecase

import br.com.horautil.domain.model.BookingStatus
import br.com.horautil.domain.repository.BookingRepository

class UpdateBookingStatusUseCase(
    private val repository: BookingRepository,
) {
    suspend operator fun invoke(bookingId: String, status: BookingStatus): Result<Unit> {
        val booking = repository.getBooking(bookingId).getOrElse { return Result.failure(it) }

        val allowed = when (status) {
            BookingStatus.ACCEPTED -> booking.status == BookingStatus.PENDING
            BookingStatus.DECLINED -> booking.status == BookingStatus.PENDING
            BookingStatus.CANCELLED -> booking.status == BookingStatus.ACCEPTED
            else -> false
        }
        if (!allowed) {
            return Result.failure(IllegalStateException("Transição de status inválida"))
        }
        return repository.updateStatus(bookingId, status)
    }
}
