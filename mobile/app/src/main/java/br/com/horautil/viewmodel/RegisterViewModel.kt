package br.com.horautil.viewmodel

import androidx.lifecycle.ViewModel
import androidx.lifecycle.ViewModelProvider
import androidx.lifecycle.viewModelScope
import androidx.lifecycle.viewmodel.initializer
import androidx.lifecycle.viewmodel.viewModelFactory
import br.com.horautil.di.AppContainer
import br.com.horautil.domain.model.AuthFieldError
import br.com.horautil.domain.usecase.RegisterUseCase
import br.com.horautil.domain.usecase.ValidateEmailUseCase
import br.com.horautil.domain.usecase.ValidateNameUseCase
import br.com.horautil.domain.usecase.ValidatePasswordUseCase
import br.com.horautil.domain.usecase.ValidatePhoneUseCase
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.update
import kotlinx.coroutines.launch

data class RegisterUiState(
    val fullName: String = "",
    val email: String = "",
    val phone: String = "",
    val password: String = "",
    val confirmPassword: String = "",
    val acceptedTerms: Boolean = false,
    val isPasswordVisible: Boolean = false,
    val isConfirmPasswordVisible: Boolean = false,
    val fullNameError: AuthFieldError? = null,
    val emailError: AuthFieldError? = null,
    val phoneError: AuthFieldError? = null,
    val passwordError: AuthFieldError? = null,
    val confirmPasswordError: AuthFieldError? = null,
    val termsError: AuthFieldError? = null,
    val isSubmitting: Boolean = false,
    val message: AuthUiMessage? = null,
    val registrationSucceeded: Boolean = false,
)

class RegisterViewModel(
    private val registerUseCase: RegisterUseCase,
    private val validateName: ValidateNameUseCase,
    private val validateEmail: ValidateEmailUseCase,
    private val validatePhone: ValidatePhoneUseCase,
    private val validatePassword: ValidatePasswordUseCase,
) : ViewModel() {

    private val _uiState = MutableStateFlow(RegisterUiState())
    val uiState: StateFlow<RegisterUiState> = _uiState.asStateFlow()

    fun onFullNameChange(value: String) {
        _uiState.update { it.copy(fullName = value, fullNameError = null) }
    }

    fun onEmailChange(value: String) {
        _uiState.update { it.copy(email = value, emailError = null) }
    }

    fun onPhoneChange(value: String) {
        _uiState.update {
            it.copy(
                phone = value.filter(Char::isDigit).take(MAX_PHONE_DIGITS),
                phoneError = null,
            )
        }
    }

    fun onPasswordChange(value: String) {
        _uiState.update {
            it.copy(
                password = value,
                passwordError = null,
                confirmPasswordError = null,
            )
        }
    }

    fun onConfirmPasswordChange(value: String) {
        _uiState.update { it.copy(confirmPassword = value, confirmPasswordError = null) }
    }

    fun onTogglePasswordVisibility() {
        _uiState.update { it.copy(isPasswordVisible = !it.isPasswordVisible) }
    }

    fun onToggleConfirmPasswordVisibility() {
        _uiState.update { it.copy(isConfirmPasswordVisible = !it.isConfirmPasswordVisible) }
    }

    fun onTermsChange(accepted: Boolean) {
        _uiState.update { it.copy(acceptedTerms = accepted, termsError = null) }
    }

    fun onMessageShown() {
        _uiState.update { it.copy(message = null) }
    }

    fun onRegistrationHandled() {
        _uiState.update { it.copy(registrationSucceeded = false) }
    }

    fun submit() {
        val current = _uiState.value
        val fullNameError = validateName(current.fullName)
        val emailError = validateEmail(current.email)
        val phoneError = validatePhone(current.phone)
        val passwordError = validatePassword(current.password)
        val confirmPasswordError = when {
            current.confirmPassword.isBlank() -> AuthFieldError.PASSWORD_REQUIRED
            current.confirmPassword != current.password -> AuthFieldError.PASSWORD_MISMATCH
            else -> null
        }
        val termsError = if (current.acceptedTerms) null else AuthFieldError.TERMS_REQUIRED

        val hasError = listOf(
            fullNameError,
            emailError,
            phoneError,
            passwordError,
            confirmPasswordError,
            termsError,
        ).any { it != null }

        if (hasError) {
            _uiState.update {
                it.copy(
                    fullNameError = fullNameError,
                    emailError = emailError,
                    phoneError = phoneError,
                    passwordError = passwordError,
                    confirmPasswordError = confirmPasswordError,
                    termsError = termsError,
                )
            }
            return
        }

        viewModelScope.launch {
            _uiState.update {
                it.copy(
                    isSubmitting = true,
                    message = null,
                    registrationSucceeded = false,
                )
            }
            val result = registerUseCase(
                fullName = current.fullName,
                email = current.email,
                phone = current.phone,
                password = current.password,
            )
            _uiState.update {
                if (result.isSuccess) {
                    it.copy(isSubmitting = false, registrationSucceeded = true)
                } else {
                    it.copy(
                        isSubmitting = false,
                        message = AuthUiMessage.RegisterFailed,
                    )
                }
            }
        }
    }

    companion object {
        private const val MAX_PHONE_DIGITS = 11

        val Factory: ViewModelProvider.Factory = viewModelFactory {
            initializer {
                RegisterViewModel(
                    registerUseCase = AppContainer.registerUseCase,
                    validateName = AppContainer.validateNameUseCase,
                    validateEmail = AppContainer.validateEmailUseCase,
                    validatePhone = AppContainer.validatePhoneUseCase,
                    validatePassword = AppContainer.validatePasswordUseCase,
                )
            }
        }
    }
}
