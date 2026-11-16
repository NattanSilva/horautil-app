package br.com.horautil.viewmodel

import androidx.lifecycle.ViewModel
import androidx.lifecycle.ViewModelProvider
import androidx.lifecycle.viewModelScope
import androidx.lifecycle.viewmodel.initializer
import androidx.lifecycle.viewmodel.viewModelFactory
import br.com.horautil.di.AppContainer
import br.com.horautil.domain.model.HomeCategory
import br.com.horautil.domain.model.HomeMatch
import br.com.horautil.domain.usecase.GetHomeFeedUseCase
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.update
import kotlinx.coroutines.launch

sealed interface HomeUiMessage {
    data object ComingSoon : HomeUiMessage
}

data class HomeUiState(
    val userName: String = "",
    val userInitials: String = "",
    val availableBalance: String = "",
    val searchQuery: String = "",
    val categories: List<HomeCategory> = emptyList(),
    val matches: List<HomeMatch> = emptyList(),
    val isLoading: Boolean = true,
    val message: HomeUiMessage? = null,
) {
    val visibleCategories: List<HomeCategory>
        get() = categories.filterByQuery(searchQuery) { it.label }

    val visibleMatches: List<HomeMatch>
        get() = matches.filterByQuery(searchQuery) { match ->
            "${match.name} ${match.teaches} ${match.wants}"
        }
}

private inline fun <T> List<T>.filterByQuery(
    query: String,
    searchableText: (T) -> String,
): List<T> {
    val term = query.trim()
    if (term.isEmpty()) return this
    return filter { searchableText(it).contains(term, ignoreCase = true) }
}

class HomeViewModel(
    private val getHomeFeedUseCase: GetHomeFeedUseCase,
) : ViewModel() {

    private val _uiState = MutableStateFlow(HomeUiState())
    val uiState: StateFlow<HomeUiState> = _uiState.asStateFlow()

    init {
        loadHomeFeed()
    }

    fun onSearchQueryChange(value: String) {
        _uiState.update { it.copy(searchQuery = value) }
    }

    fun onComingSoon() {
        _uiState.update { it.copy(message = HomeUiMessage.ComingSoon) }
    }

    fun onMessageShown() {
        _uiState.update { it.copy(message = null) }
    }

    private fun loadHomeFeed() {
        viewModelScope.launch {
            val result = getHomeFeedUseCase()
            _uiState.update { current ->
                result.fold(
                    onSuccess = { feed ->
                        current.copy(
                            userName = feed.userName,
                            userInitials = feed.userInitials,
                            availableBalance = feed.availableBalance,
                            categories = feed.categories,
                            matches = feed.matches,
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
                HomeViewModel(getHomeFeedUseCase = AppContainer.getHomeFeedUseCase)
            }
        }
    }
}
