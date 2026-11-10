package br.com.horautil.viewmodel

import androidx.lifecycle.ViewModel
import androidx.lifecycle.ViewModelProvider
import androidx.lifecycle.viewModelScope
import androidx.lifecycle.viewmodel.initializer
import androidx.lifecycle.viewmodel.viewModelFactory
import br.com.horautil.di.AppContainer
import br.com.horautil.domain.model.AuthFieldError
import br.com.horautil.domain.usecase.LoginUseCase
import br.com.horautil.domain.usecase.ValidateEmailUseCase
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.update
import kotlinx.coroutines.launch

data class LoginUiState(
    val email: String = "",
    val password: String = "",
    val isPasswordVisible: Boolean = false,
    val emailError: AuthFieldError? = null,
    val passwordError: AuthFieldError? = null,
    val isSubmitting: Boolean = false,
    val message: AuthUiMessage? = null,
)

class LoginViewModel(
    private val loginUseCase: LoginUseCase,
    private val validateEmail: ValidateEmailUseCase,
) : ViewModel() {

    private val _uiState = MutableStateFlow(LoginUiState())
    val uiState: StateFlow<LoginUiState> = _uiState.asStateFlow()

    fun onEmailChange(value: String) {
        _uiState.update { it.copy(email = value, emailError = null) }
    }

    fun onPasswordChange(value: String) {
        _uiState.update { it.copy(password = value, passwordError = null) }
    }

    fun onTogglePasswordVisibility() {
        _uiState.update { it.copy(isPasswordVisible = !it.isPasswordVisible) }
    }

    fun onForgotPasswordClick() {
        _uiState.update { it.copy(message = AuthUiMessage.ForgotPasswordUnavailable) }
    }

    fun onSocialLoginClick(provider: String) {
        _uiState.update { it.copy(message = AuthUiMessage.SocialLoginUnavailable(provider)) }
    }

    fun onMessageShown() {
        _uiState.update { it.copy(message = null) }
    }

    fun submit() {
        val current = _uiState.value
        val emailError = validateEmail(current.email)
        val passwordError = if (current.password.isBlank()) {
            AuthFieldError.PASSWORD_REQUIRED
        } else {
            null
        }

        if (emailError != null || passwordError != null) {
            _uiState.update {
                it.copy(emailError = emailError, passwordError = passwordError)
            }
            return
        }

        viewModelScope.launch {
            _uiState.update { it.copy(isSubmitting = true, message = null) }
            val result = loginUseCase(current.email, current.password)
            _uiState.update {
                it.copy(
                    isSubmitting = false,
                    message = if (result.isSuccess) {
                        AuthUiMessage.LoginSuccess
                    } else {
                        AuthUiMessage.LoginFailed
                    },
                )
            }
        }
    }

    companion object {
        val Factory: ViewModelProvider.Factory = viewModelFactory {
            initializer {
                LoginViewModel(
                    loginUseCase = AppContainer.loginUseCase,
                    validateEmail = AppContainer.validateEmailUseCase,
                )
            }
        }
    }
}
