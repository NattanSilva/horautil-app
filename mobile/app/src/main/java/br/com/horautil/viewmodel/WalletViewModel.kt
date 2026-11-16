package br.com.horautil.viewmodel

import androidx.lifecycle.ViewModel
import androidx.lifecycle.ViewModelProvider
import androidx.lifecycle.viewModelScope
import androidx.lifecycle.viewmodel.initializer
import androidx.lifecycle.viewmodel.viewModelFactory
import br.com.horautil.di.AppContainer
import br.com.horautil.domain.model.WalletSummary
import br.com.horautil.domain.usecase.GetWalletSummaryUseCase
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.update
import kotlinx.coroutines.launch

data class WalletUiState(
    val isLoading: Boolean = true,
    val summary: WalletSummary? = null,
)

class WalletViewModel(
    private val getWalletSummaryUseCase: GetWalletSummaryUseCase,
) : ViewModel() {

    private val _uiState = MutableStateFlow(WalletUiState())
    val uiState: StateFlow<WalletUiState> = _uiState.asStateFlow()

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
            val result = getWalletSummaryUseCase()
            _uiState.update { current ->
                result.fold(
                    onSuccess = { summary ->
                        current.copy(isLoading = false, summary = summary)
                    },
                    onFailure = { current.copy(isLoading = false) },
                )
            }
        }
    }

    companion object {
        val Factory: ViewModelProvider.Factory = viewModelFactory {
            initializer {
                WalletViewModel(getWalletSummaryUseCase = AppContainer.getWalletSummaryUseCase)
            }
        }
    }
}
