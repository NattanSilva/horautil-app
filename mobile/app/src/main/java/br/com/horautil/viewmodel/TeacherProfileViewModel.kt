package br.com.horautil.viewmodel

import androidx.lifecycle.ViewModel
import androidx.lifecycle.ViewModelProvider
import androidx.lifecycle.viewModelScope
import androidx.lifecycle.viewmodel.initializer
import androidx.lifecycle.viewmodel.viewModelFactory
import br.com.horautil.di.AppContainer
import br.com.horautil.domain.model.BookingRequest
import br.com.horautil.domain.model.TeacherDetail
import br.com.horautil.domain.usecase.GetTeacherDetailUseCase
import br.com.horautil.domain.usecase.RequestBookingUseCase
import java.util.Locale
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.update
import kotlinx.coroutines.launch

sealed interface TeacherProfileMessage {
    data object BookingFailed : TeacherProfileMessage
}

data class TeacherProfileUiState(
    val isLoading: Boolean = true,
    val detail: TeacherDetail? = null,
    val selectedDay: Int? = null,
    val selectedSlot: String? = null,
    val selectedDuration: Int? = null,
    val isSubmitting: Boolean = false,
    val bookingSucceeded: Boolean = false,
    val message: TeacherProfileMessage? = null,
) {
    val canSubmit: Boolean
        get() = detail != null &&
            selectedDay != null &&
            selectedSlot != null &&
            selectedDuration != null &&
            !isSubmitting
}

class TeacherProfileViewModel(
    private val teacherId: String,
    private val getTeacherDetailUseCase: GetTeacherDetailUseCase,
    private val requestBookingUseCase: RequestBookingUseCase,
) : ViewModel() {

    private val _uiState = MutableStateFlow(TeacherProfileUiState())
    val uiState: StateFlow<TeacherProfileUiState> = _uiState.asStateFlow()

    init {
        loadTeacher()
    }

    fun onDaySelected(day: Int) {
        val availability = _uiState.value.detail?.availability ?: return
        val isEnabled = availability.days.any { it.dayOfMonth == day && it.enabled }
        if (isEnabled) {
            _uiState.update { it.copy(selectedDay = day) }
        }
    }

    fun onSlotSelected(slot: String) {
        _uiState.update { it.copy(selectedSlot = slot) }
    }

    fun onDurationSelected(duration: Int) {
        _uiState.update { it.copy(selectedDuration = duration) }
    }

    fun onMessageShown() {
        _uiState.update { it.copy(message = null) }
    }

    fun requestBooking() {
        val current = _uiState.value
        val detail = current.detail ?: return
        val day = current.selectedDay ?: return
        val slot = current.selectedSlot ?: return
        val duration = current.selectedDuration ?: return
        if (current.isSubmitting) return

        viewModelScope.launch {
            _uiState.update { it.copy(isSubmitting = true, message = null) }
            val monthName = detail.availability.monthLabel
                .substringBefore(" ")
                .lowercase(Locale.forLanguageTag("pt-BR"))
            val result = requestBookingUseCase(
                BookingRequest(
                    teacher = detail.profile,
                    dateLabel = "$day de $monthName",
                    timeLabel = slot,
                    durationMinutes = duration,
                ),
            )
            _uiState.update { state ->
                if (result.isSuccess) {
                    state.copy(isSubmitting = false, bookingSucceeded = true)
                } else {
                    state.copy(
                        isSubmitting = false,
                        message = TeacherProfileMessage.BookingFailed,
                    )
                }
            }
        }
    }

    private fun loadTeacher() {
        viewModelScope.launch {
            val result = getTeacherDetailUseCase(teacherId)
            _uiState.update { current ->
                result.fold(
                    onSuccess = { detail ->
                        current.copy(
                            isLoading = false,
                            detail = detail,
                            selectedDay = detail.availability.defaultDay,
                            selectedSlot = detail.availability.defaultSlot,
                            selectedDuration = detail.availability.defaultDuration,
                        )
                    },
                    onFailure = { current.copy(isLoading = false) },
                )
            }
        }
    }

    companion object {
        fun factory(teacherId: String): ViewModelProvider.Factory = viewModelFactory {
            initializer {
                TeacherProfileViewModel(
                    teacherId = teacherId,
                    getTeacherDetailUseCase = AppContainer.getTeacherDetailUseCase,
                    requestBookingUseCase = AppContainer.requestBookingUseCase,
                )
            }
        }
    }
}

