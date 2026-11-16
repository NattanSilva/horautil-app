package br.com.horautil.viewmodel

import androidx.lifecycle.ViewModel
import androidx.lifecycle.ViewModelProvider
import androidx.lifecycle.viewModelScope
import androidx.lifecycle.viewmodel.initializer
import androidx.lifecycle.viewmodel.viewModelFactory
import br.com.horautil.di.AppContainer
import br.com.horautil.domain.model.Booking
import br.com.horautil.domain.usecase.GetBookingUseCase
import br.com.horautil.domain.usecase.SubmitReviewUseCase
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.update
import kotlinx.coroutines.launch

sealed interface ReviewMessage {
    data object SubmitFailed : ReviewMessage
    data object LoadFailed : ReviewMessage
}

data class ReviewUiState(
    val isLoading: Boolean = true,
    val booking: Booking? = null,
    val rating: Int = 4,
    val comment: String = "",
    val isSubmitting: Boolean = false,
    val submitted: Boolean = false,
    val message: ReviewMessage? = null,
)

class ReviewViewModel(
    private val bookingId: String,
    private val getBookingUseCase: GetBookingUseCase,
    private val submitReviewUseCase: SubmitReviewUseCase,
) : ViewModel() {

    private val _uiState = MutableStateFlow(ReviewUiState())
    val uiState: StateFlow<ReviewUiState> = _uiState.asStateFlow()

    init {
        loadBooking()
    }

    fun onRatingSelected(rating: Int) {
        _uiState.update { it.copy(rating = rating) }
    }

    fun onCommentChange(comment: String) {
        _uiState.update { it.copy(comment = comment) }
    }

    fun onMessageShown() {
        _uiState.update { it.copy(message = null) }
    }

    fun submit() {
        val current = _uiState.value
        if (current.isSubmitting || current.booking == null) return

        viewModelScope.launch {
            _uiState.update { it.copy(isSubmitting = true, message = null) }
            val result = submitReviewUseCase(
                bookingId = bookingId,
                rating = current.rating,
                comment = current.comment,
            )
            _uiState.update { state ->
                if (result.isSuccess) {
                    state.copy(isSubmitting = false, submitted = true)
                } else {
                    state.copy(
                        isSubmitting = false,
                        message = ReviewMessage.SubmitFailed,
                    )
                }
            }
        }
    }

    private fun loadBooking() {
        viewModelScope.launch {
            val result = getBookingUseCase(bookingId)
            _uiState.update { current ->
                result.fold(
                    onSuccess = { booking ->
                        current.copy(isLoading = false, booking = booking)
                    },
                    onFailure = {
                        current.copy(
                            isLoading = false,
                            message = ReviewMessage.LoadFailed,
                        )
                    },
                )
            }
        }
    }

    companion object {
        fun factory(bookingId: String): ViewModelProvider.Factory = viewModelFactory {
            initializer {
                ReviewViewModel(
                    bookingId = bookingId,
                    getBookingUseCase = AppContainer.getBookingUseCase,
                    submitReviewUseCase = AppContainer.submitReviewUseCase,
                )
            }
        }
    }
}
