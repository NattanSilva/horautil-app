package br.com.horautil.viewmodel

import androidx.lifecycle.ViewModel
import androidx.lifecycle.ViewModelProvider
import androidx.lifecycle.viewModelScope
import androidx.lifecycle.viewmodel.initializer
import androidx.lifecycle.viewmodel.viewModelFactory
import br.com.horautil.di.AppContainer
import br.com.horautil.domain.model.OnboardingOptions
import br.com.horautil.domain.model.OnboardingSelection
import br.com.horautil.domain.usecase.CompleteOnboardingUseCase
import br.com.horautil.domain.usecase.GetOnboardingOptionsUseCase
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.update
import kotlinx.coroutines.launch

data class OnboardingUiState(
    val step: Int = 2,
    val totalSteps: Int = 3,
    val options: OnboardingOptions? = null,
    val teachIds: Set<String> = emptySet(),
    val learnIds: Set<String> = emptySet(),
    val dayIds: Set<String> = emptySet(),
    val periodIds: Set<String> = emptySet(),
    val isLoading: Boolean = true,
    val isSubmitting: Boolean = false,
    val completed: Boolean = false,
    val hasError: Boolean = false,
)

class OnboardingViewModel(
    private val getOptionsUseCase: GetOnboardingOptionsUseCase,
    private val completeOnboardingUseCase: CompleteOnboardingUseCase,
) : ViewModel() {

    private val _uiState = MutableStateFlow(OnboardingUiState())
    val uiState: StateFlow<OnboardingUiState> = _uiState.asStateFlow()

    init {
        loadOptions()
    }

    fun onTeachToggle(id: String) {
        _uiState.update { it.copy(teachIds = it.teachIds.toggled(id)) }
    }

    fun onLearnToggle(id: String) {
        _uiState.update { it.copy(learnIds = it.learnIds.toggled(id)) }
    }

    fun onDayToggle(id: String) {
        _uiState.update { it.copy(dayIds = it.dayIds.toggled(id)) }
    }

    fun onPeriodToggle(id: String) {
        _uiState.update { it.copy(periodIds = it.periodIds.toggled(id)) }
    }

    fun onErrorShown() {
        _uiState.update { it.copy(hasError = false) }
    }

    fun complete() {
        if (_uiState.value.isSubmitting) return

        viewModelScope.launch {
            _uiState.update { it.copy(isSubmitting = true, hasError = false) }
            val current = _uiState.value
            val result = completeOnboardingUseCase(
                OnboardingSelection(
                    teachIds = current.teachIds,
                    learnIds = current.learnIds,
                    dayIds = current.dayIds,
                    periodIds = current.periodIds,
                ),
            )
            _uiState.update { current ->
                result.fold(
                    onSuccess = { current.copy(isSubmitting = false, completed = true) },
                    onFailure = { current.copy(isSubmitting = false, hasError = true) },
                )
            }
        }
    }

    private fun loadOptions() {
        viewModelScope.launch {
            val result = getOptionsUseCase()
            _uiState.update { current ->
                result.fold(
                    onSuccess = { options ->
                        current.copy(
                            options = options,
                            teachIds = options.defaultTeachIds,
                            learnIds = options.defaultLearnIds,
                            dayIds = options.defaultDayIds,
                            periodIds = options.defaultPeriodIds,
                            isLoading = false,
                        )
                    },
                    onFailure = { current.copy(isLoading = false) },
                )
            }
        }
    }

    companion object {
        val Factory: ViewModelProvider.Factory = viewModelFactory {
            initializer {
                OnboardingViewModel(
                    getOptionsUseCase = AppContainer.getOnboardingOptionsUseCase,
                    completeOnboardingUseCase = AppContainer.completeOnboardingUseCase,
                )
            }
        }
    }
}

private fun Set<String>.toggled(id: String): Set<String> =
    if (contains(id)) this - id else this + id
