package br.com.horautil.data

import br.com.horautil.data.repository.InMemoryBookingRepository
import br.com.horautil.data.repository.InMemoryHomeRepository
import br.com.horautil.data.repository.InMemoryOnboardingRepository
import br.com.horautil.data.repository.InMemoryReviewRepository
import br.com.horautil.data.repository.InMemoryTeacherRepository
import br.com.horautil.data.repository.InMemoryUserProfileRepository
import br.com.horautil.data.repository.InMemoryWalletRepository
import br.com.horautil.domain.model.BookingRequest
import br.com.horautil.domain.model.BookingStatus
import br.com.horautil.domain.model.OnboardingSelection
import br.com.horautil.domain.usecase.CompleteOnboardingUseCase
import br.com.horautil.domain.usecase.RequestBookingUseCase
import br.com.horautil.domain.usecase.SubmitReviewUseCase
import br.com.horautil.domain.usecase.UpdateBookingStatusUseCase
import kotlinx.coroutines.runBlocking
import org.junit.Assert.assertEquals
import org.junit.Assert.assertTrue
import org.junit.Test

class MockFlowTest {

    @Test
    fun onboardingUpdatesSkillsAndGrantsWelcomeBonusOnce() = runBlocking {
        val userProfileRepository = InMemoryUserProfileRepository()
        val walletRepository = InMemoryWalletRepository()
        val onboardingRepository = InMemoryOnboardingRepository()
        val useCase = CompleteOnboardingUseCase(
            repository = onboardingRepository,
            userProfileRepository = userProfileRepository,
            walletRepository = walletRepository,
        )
        val selection = OnboardingSelection(
            teachIds = setOf("violao"),
            learnIds = setOf("piano", "culinaria"),
            dayIds = setOf("seg"),
            periodIds = setOf("tarde"),
        )

        assertTrue(useCase(selection).isSuccess)
        assertTrue(useCase(selection).isSuccess)

        val profile = userProfileRepository.getProfile().getOrThrow()
        assertEquals(listOf("Violão"), profile.teaches)
        assertEquals(listOf("Culinária", "Piano"), profile.wants)
        assertEquals(
            14.5,
            walletRepository.getSummary().getOrThrow().availableHours,
            0.001,
        )
    }

    @Test
    fun bookingCanBeAcceptedCompletedReviewedAndDebitsWallet() = runBlocking {
        val bookingRepository = InMemoryBookingRepository()
        val walletRepository = InMemoryWalletRepository()
        val requestBooking = RequestBookingUseCase(bookingRepository)
        val updateStatus = UpdateBookingStatusUseCase(bookingRepository)
        val submitReview = SubmitReviewUseCase(
            bookingRepository = bookingRepository,
            reviewRepository = InMemoryReviewRepository(),
            walletRepository = walletRepository,
        )
        val teacher = InMemoryTeacherRepository()
            .getTeacher("julia-r")
            .getOrThrow()
            .profile

        val booking = requestBooking(
            BookingRequest(
                teacher = teacher,
                dateLabel = "Hoje",
                timeLabel = "14:00",
                durationMinutes = 60,
            ),
        ).getOrThrow()
        assertEquals(BookingStatus.PENDING, booking.status)

        assertTrue(updateStatus(booking.id, BookingStatus.ACCEPTED).isSuccess)
        assertTrue(updateStatus(booking.id, BookingStatus.COMPLETED).isSuccess)
        assertTrue(submitReview(booking.id, 5, "Aula excelente").isSuccess)

        val updated = bookingRepository.getBooking(booking.id).getOrThrow()
        assertEquals(BookingStatus.COMPLETED, updated.status)
        assertTrue(updated.reviewed)
        assertEquals(
            11.5,
            walletRepository.getSummary().getOrThrow().availableHours,
            0.001,
        )

        assertTrue(submitReview(booking.id, 4, "").isFailure)
        assertEquals(
            11.5,
            walletRepository.getSummary().getOrThrow().availableHours,
            0.001,
        )
    }

    @Test
    fun homeFeedReflectsWalletBalance() = runBlocking {
        val userProfileRepository = InMemoryUserProfileRepository()
        val walletRepository = InMemoryWalletRepository()
        val homeRepository = InMemoryHomeRepository(userProfileRepository, walletRepository)

        walletRepository.settleLesson("booking-x", "Aula de Yoga", 1.0).getOrThrow()

        val feed = homeRepository.getHomeFeed().getOrThrow()
        assertEquals("Maria", feed.userName)
        assertEquals("11,5 h", feed.availableBalance)
        assertEquals(5, feed.matches.size)
        assertEquals("4,9", feed.matches.first().rating)
    }
}
