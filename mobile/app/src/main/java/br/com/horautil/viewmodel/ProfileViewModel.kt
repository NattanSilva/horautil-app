package br.com.horautil.viewmodel

import androidx.lifecycle.ViewModel
import androidx.lifecycle.ViewModelProvider
import androidx.lifecycle.viewModelScope
import androidx.lifecycle.viewmodel.initializer
import androidx.lifecycle.viewmodel.viewModelFactory
import br.com.horautil.di.AppContainer
import br.com.horautil.domain.model.UserProfile
import br.com.horautil.domain.usecase.GetUserProfileUseCase
import br.com.horautil.domain.usecase.GetWalletSummaryUseCase
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.update
import kotlinx.coroutines.launch

data class ProfileUiState(
    val isLoading: Boolean = true,
    val profile: UserProfile? = null,
    val availableHours: Double = 0.0,
)

class ProfileViewModel(
    private val getUserProfileUseCase: GetUserProfileUseCase,
    private val getWalletSummaryUseCase: GetWalletSummaryUseCase,
) : ViewModel() {

    private val _uiState = MutableStateFlow(ProfileUiState())
    val uiState: StateFlow<ProfileUiState> = _uiState.asStateFlow()

    init {
        load(showLoading = true)
    }

    fun refresh() {
        if (!_uiState.value.isLoading) {
            load(showLoading = false)
        }
    }

    private fun load(showLoading: Boolean) {
        viewModelScope.launch {
            if (showLoading) {
                _uiState.update { it.copy(isLoading = true) }
            }
            val profile = getUserProfileUseCase().getOrNull()
            val wallet = getWalletSummaryUseCase().getOrNull()
            _uiState.update {
                it.copy(
                    isLoading = false,
                    profile = profile,
                    availableHours = wallet?.availableHours ?: it.availableHours,
                )
            }
        }
    }

    companion object {
        val Factory: ViewModelProvider.Factory = viewModelFactory {
            initializer {
                ProfileViewModel(
                    getUserProfileUseCase = AppContainer.getUserProfileUseCase,
                    getWalletSummaryUseCase = AppContainer.getWalletSummaryUseCase,
                )
            }
        }
    }
}
