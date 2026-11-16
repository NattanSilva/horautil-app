package br.com.horautil.domain.repository

import br.com.horautil.domain.model.Booking
import br.com.horautil.domain.model.BookingRequest
import br.com.horautil.domain.model.BookingStatus

interface BookingRepository {
    suspend fun getBookings(): Result<List<Booking>>
    suspend fun getBooking(bookingId: String): Result<Booking>
    suspend fun createBooking(request: BookingRequest): Result<Booking>
    suspend fun updateStatus(bookingId: String, status: BookingStatus): Result<Unit>
    suspend fun markReviewed(bookingId: String): Result<Unit>
}
