package br.com.horautil.domain.usecase

import br.com.horautil.domain.model.Booking
import br.com.horautil.domain.repository.BookingRepository

class GetBookingsUseCase(
    private val repository: BookingRepository,
) {
    suspend operator fun invoke(): Result<List<Booking>> = repository.getBookings()
}
