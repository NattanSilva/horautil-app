package br.com.horautil.viewmodel

import androidx.lifecycle.ViewModel
import androidx.lifecycle.ViewModelProvider
import androidx.lifecycle.viewModelScope
import androidx.lifecycle.viewmodel.initializer
import androidx.lifecycle.viewmodel.viewModelFactory
import br.com.horautil.di.AppContainer
import br.com.horautil.domain.model.AppNotification
import br.com.horautil.domain.repository.NotificationRepository
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.SharingStarted
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.combine
import kotlinx.coroutines.flow.stateIn
import kotlinx.coroutines.launch

data class NotificationsUiState(
    val notifications: List<AppNotification> = emptyList(),
    val isLoading: Boolean = true,
) {
    val unreadCount: Int get() = notifications.count { !it.isRead }
    val hasUnread: Boolean get() = unreadCount > 0
}

class NotificationsViewModel(
    private val repository: NotificationRepository,
) : ViewModel() {

    private val loading = MutableStateFlow(true)

    val uiState: StateFlow<NotificationsUiState> = combine(
        repository.observeNotifications(),
        loading,
    ) { notifications, isLoading ->
        NotificationsUiState(
            notifications = notifications,
            isLoading = isLoading,
        )
    }.stateIn(
        scope = viewModelScope,
        started = SharingStarted.WhileSubscribed(5_000),
        initialValue = NotificationsUiState(),
    )

    init {
        viewModelScope.launch {
            repository.observeNotifications().collect { loading.value = false }
        }
    }

    fun markAsRead(id: String) {
        viewModelScope.launch { repository.markAsRead(id) }
    }

    fun markAllAsRead() {
        viewModelScope.launch { repository.markAllAsRead() }
    }

    companion object {
        val Factory: ViewModelProvider.Factory = viewModelFactory {
            initializer {
                NotificationsViewModel(repository = AppContainer.notificationRepository)
            }
        }
    }
}
