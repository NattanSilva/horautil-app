package br.com.horautil.di

import br.com.horautil.data.repository.InMemoryAuthRepository
import br.com.horautil.data.repository.InMemoryBookingRepository
import br.com.horautil.data.repository.InMemoryHomeRepository
import br.com.horautil.data.repository.InMemoryOnboardingRepository
import br.com.horautil.data.repository.InMemoryReviewRepository
import br.com.horautil.data.repository.InMemoryTeacherRepository
import br.com.horautil.data.repository.InMemoryUserProfileRepository
import br.com.horautil.data.repository.InMemoryWalletRepository
import br.com.horautil.domain.repository.AuthRepository
import br.com.horautil.domain.repository.BookingRepository
import br.com.horautil.domain.repository.HomeRepository
import br.com.horautil.domain.repository.OnboardingRepository
import br.com.horautil.domain.repository.ReviewRepository
import br.com.horautil.domain.repository.TeacherRepository
import br.com.horautil.domain.repository.UserProfileRepository
import br.com.horautil.domain.repository.WalletRepository
import br.com.horautil.domain.usecase.CompleteOnboardingUseCase
import br.com.horautil.domain.usecase.GetBookingUseCase
import br.com.horautil.domain.usecase.GetBookingsUseCase
import br.com.horautil.domain.usecase.GetHomeFeedUseCase
import br.com.horautil.domain.usecase.GetOnboardingOptionsUseCase
import br.com.horautil.domain.usecase.GetTeacherDetailUseCase
import br.com.horautil.domain.usecase.GetUserProfileUseCase
import br.com.horautil.domain.usecase.GetWalletSummaryUseCase
import br.com.horautil.domain.usecase.LoginUseCase
import br.com.horautil.domain.usecase.RegisterUseCase
import br.com.horautil.domain.usecase.RequestBookingUseCase
import br.com.horautil.domain.usecase.SubmitReviewUseCase
import br.com.horautil.domain.usecase.UpdateBookingStatusUseCase
import br.com.horautil.domain.usecase.ValidateEmailUseCase
import br.com.horautil.domain.usecase.ValidateNameUseCase
import br.com.horautil.domain.usecase.ValidatePasswordUseCase
import br.com.horautil.domain.usecase.ValidatePhoneUseCase

object AppContainer {
    private val authRepository: AuthRepository = InMemoryAuthRepository()
    private val userProfileRepository: UserProfileRepository = InMemoryUserProfileRepository()
    private val walletRepository: WalletRepository = InMemoryWalletRepository()
    private val homeRepository: HomeRepository = InMemoryHomeRepository(
        userProfileRepository = userProfileRepository,
        walletRepository = walletRepository,
    )
    private val onboardingRepository: OnboardingRepository = InMemoryOnboardingRepository()
    private val teacherRepository: TeacherRepository = InMemoryTeacherRepository()
    private val bookingRepository: BookingRepository = InMemoryBookingRepository()
    private val reviewRepository: ReviewRepository = InMemoryReviewRepository()

    val loginUseCase = LoginUseCase(authRepository)
    val registerUseCase = RegisterUseCase(authRepository)
    val validateNameUseCase = ValidateNameUseCase()
    val validateEmailUseCase = ValidateEmailUseCase()
    val validatePhoneUseCase = ValidatePhoneUseCase()
    val validatePasswordUseCase = ValidatePasswordUseCase()
    val getHomeFeedUseCase = GetHomeFeedUseCase(homeRepository)
    val getUserProfileUseCase = GetUserProfileUseCase(userProfileRepository)
    val getOnboardingOptionsUseCase = GetOnboardingOptionsUseCase(onboardingRepository)
    val completeOnboardingUseCase = CompleteOnboardingUseCase(
        repository = onboardingRepository,
        userProfileRepository = userProfileRepository,
        walletRepository = walletRepository,
    )
    val getTeacherDetailUseCase = GetTeacherDetailUseCase(teacherRepository)
    val requestBookingUseCase = RequestBookingUseCase(bookingRepository)
    val getBookingsUseCase = GetBookingsUseCase(bookingRepository)
    val getBookingUseCase = GetBookingUseCase(bookingRepository)
    val updateBookingStatusUseCase = UpdateBookingStatusUseCase(bookingRepository)
    val getWalletSummaryUseCase = GetWalletSummaryUseCase(walletRepository)
    val submitReviewUseCase = SubmitReviewUseCase(
        bookingRepository = bookingRepository,
        reviewRepository = reviewRepository,
        walletRepository = walletRepository,
    )
}
