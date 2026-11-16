package br.com.horautil.domain.usecase

import br.com.horautil.domain.model.Booking
import br.com.horautil.domain.repository.BookingRepository

class GetBookingUseCase(
    private val repository: BookingRepository,
) {
    suspend operator fun invoke(bookingId: String): Result<Booking> =
        repository.getBooking(bookingId)
}
