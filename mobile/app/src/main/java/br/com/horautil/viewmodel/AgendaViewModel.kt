package br.com.horautil.viewmodel

import androidx.lifecycle.ViewModel
import androidx.lifecycle.ViewModelProvider
import androidx.lifecycle.viewModelScope
import androidx.lifecycle.viewmodel.initializer
import androidx.lifecycle.viewmodel.viewModelFactory
import br.com.horautil.di.AppContainer
import br.com.horautil.domain.model.Booking
import br.com.horautil.domain.model.BookingStatus
import br.com.horautil.domain.usecase.GetBookingsUseCase
import br.com.horautil.domain.usecase.UpdateBookingStatusUseCase
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.update
import kotlinx.coroutines.launch

enum class AgendaFilter(val status: BookingStatus) {
    PENDING(BookingStatus.PENDING),
    ACCEPTED(BookingStatus.ACCEPTED),
    COMPLETED(BookingStatus.COMPLETED),
}

sealed interface AgendaMessage {
    data object ActionFailed : AgendaMessage
}

data class AgendaUiState(
    val isLoading: Boolean = true,
    val selectedFilter: AgendaFilter = AgendaFilter.ACCEPTED,
    val bookings: List<Booking> = emptyList(),
    val message: AgendaMessage? = null,
) {
    val visibleBookings: List<Booking>
        get() = bookings.filter { it.status == selectedFilter.status }
}

class AgendaViewModel(
    private val getBookingsUseCase: GetBookingsUseCase,
    private val updateBookingStatusUseCase: UpdateBookingStatusUseCase,
    initialFilter: AgendaFilter = AgendaFilter.ACCEPTED,
) : ViewModel() {

    private val _uiState = MutableStateFlow(AgendaUiState(selectedFilter = initialFilter))
    val uiState: StateFlow<AgendaUiState> = _uiState.asStateFlow()

    init {
        load(showLoading = true)
    }

    fun refresh() {
        if (!_uiState.value.isLoading) {
            load(showLoading = false)
        }
    }

    fun onFilterSelected(filter: AgendaFilter) {
        _uiState.update { it.copy(selectedFilter = filter) }
    }

    fun accept(bookingId: String) {
        changeStatus(bookingId, BookingStatus.ACCEPTED)
    }

    fun decline(bookingId: String) {
        changeStatus(bookingId, BookingStatus.DECLINED)
    }

    fun cancel(bookingId: String) {
        changeStatus(bookingId, BookingStatus.CANCELLED)
    }

    fun complete(bookingId: String) {
        viewModelScope.launch {
            val result = updateBookingStatusUseCase(bookingId, BookingStatus.COMPLETED)
            if (result.isSuccess) {
                _uiState.update { it.copy(selectedFilter = AgendaFilter.COMPLETED) }
                load(showLoading = false)
            } else {
                _uiState.update { it.copy(message = AgendaMessage.ActionFailed) }
            }
        }
    }

    fun onMessageShown() {
        _uiState.update { it.copy(message = null) }
    }

    private fun changeStatus(bookingId: String, status: BookingStatus) {
        viewModelScope.launch {
            val result = updateBookingStatusUseCase(bookingId, status)
            if (result.isSuccess) {
                load(showLoading = false)
            } else {
                _uiState.update { it.copy(message = AgendaMessage.ActionFailed) }
            }
        }
    }

    private fun load(showLoading: Boolean) {
        viewModelScope.launch {
            if (showLoading) {
                _uiState.update { it.copy(isLoading = true) }
            }
            val result = getBookingsUseCase()
            _uiState.update { current ->
                result.fold(
                    onSuccess = { bookings ->
                        current.copy(isLoading = false, bookings = bookings)
                    },
                    onFailure = { current.copy(isLoading = false) },
                )
            }
        }
    }

    companion object {
        fun factory(
            initialFilter: AgendaFilter = AgendaFilter.ACCEPTED,
        ): ViewModelProvider.Factory = viewModelFactory {
            initializer {
                AgendaViewModel(
                    getBookingsUseCase = AppContainer.getBookingsUseCase,
                    updateBookingStatusUseCase = AppContainer.updateBookingStatusUseCase,
                    initialFilter = initialFilter,
                )
            }
        }
    }
}
