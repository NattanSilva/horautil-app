package br.com.horautil.data.repository

import br.com.horautil.domain.model.Booking
import br.com.horautil.domain.model.BookingIcon
import br.com.horautil.domain.model.BookingRequest
import br.com.horautil.domain.model.BookingStatus
import br.com.horautil.domain.model.HomePalette
import br.com.horautil.domain.repository.BookingRepository
import kotlinx.coroutines.flow.MutableStateFlow

class InMemoryBookingRepository : BookingRepository {

    private val bookings = MutableStateFlow(seedBookings())
    private var nextId = 1

    override suspend fun getBookings(): Result<List<Booking>> =
        Result.success(bookings.value)

    override suspend fun getBooking(bookingId: String): Result<Booking> {
        val booking = bookings.value.firstOrNull { it.id == bookingId }
            ?: return Result.failure(NoSuchElementException("Agendamento não encontrado"))
        return Result.success(booking)
    }

    override suspend fun createBooking(request: BookingRequest): Result<Booking> {
        val booking = Booking(
            id = "booking-${nextId++}",
            teacherId = request.teacher.id,
            teacherName = request.teacher.name,
            teacherInitials = request.teacher.initials,
            skill = request.teacher.headline,
            dateLabel = request.dateLabel,
            timeLabel = request.timeLabel,
            durationMinutes = request.durationMinutes,
            status = BookingStatus.PENDING,
            icon = request.teacher.icon,
            palette = request.teacher.palette,
        )
        bookings.value = listOf(booking) + bookings.value
        return Result.success(booking)
    }

    override suspend fun updateStatus(bookingId: String, status: BookingStatus): Result<Unit> {
        var found = false
        bookings.value = bookings.value.map { booking ->
            if (booking.id == bookingId) {
                found = true
                booking.copy(status = status)
            } else {
                booking
            }
        }
        return if (found) {
            Result.success(Unit)
        } else {
            Result.failure(NoSuchElementException("Agendamento não encontrado"))
        }
    }

    override suspend fun markReviewed(bookingId: String): Result<Unit> {
        var found = false
        bookings.value = bookings.value.map { booking ->
            if (booking.id == bookingId) {
                found = true
                booking.copy(reviewed = true)
            } else {
                booking
            }
        }
        return if (found) {
            Result.success(Unit)
        } else {
            Result.failure(NoSuchElementException("Agendamento não encontrado"))
        }
    }

    private fun seedBookings() = listOf(
        Booking(
            id = "booking-ana-hoje",
            teacherId = "ana-paula",
            teacherName = "Ana Paula",
            teacherInitials = "AP",
            skill = "Violão",
            dateLabel = "Hoje",
            timeLabel = "14:00",
            durationMinutes = 60,
            status = BookingStatus.ACCEPTED,
            icon = BookingIcon.MUSIC,
            palette = HomePalette.PINK,
        ),
        Booking(
            id = "booking-carlos-sabado",
            teacherId = "carlos-m",
            teacherName = "Carlos M.",
            teacherInitials = "CM",
            skill = "Inglês",
            dateLabel = "Sáb",
            timeLabel = "10:00",
            durationMinutes = 90,
            status = BookingStatus.ACCEPTED,
            icon = BookingIcon.LANGUAGES,
            palette = HomePalette.CYAN,
        ),
        Booking(
            id = "booking-ana-amanha",
            teacherId = "ana-paula",
            teacherName = "Ana Paula",
            teacherInitials = "AP",
            skill = "Violão",
            dateLabel = "Amanhã",
            timeLabel = "09:00",
            durationMinutes = 30,
            status = BookingStatus.PENDING,
            icon = BookingIcon.MUSIC,
            palette = HomePalette.PINK,
        ),
        Booking(
            id = "booking-julia-concluida",
            teacherId = "julia-r",
            teacherName = "Júlia R.",
            teacherInitials = "JR",
            skill = "Yoga",
            dateLabel = "12/10/2026",
            timeLabel = "18:30",
            durationMinutes = 60,
            status = BookingStatus.COMPLETED,
            icon = BookingIcon.YOGA,
            palette = HomePalette.GREEN,
        ),
    )
}
