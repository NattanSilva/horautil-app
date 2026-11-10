package br.com.horautil.viewmodel

sealed interface AuthUiMessage {
    data object LoginSuccess : AuthUiMessage
    data object LoginFailed : AuthUiMessage
    data object RegisterFailed : AuthUiMessage
    data object ForgotPasswordUnavailable : AuthUiMessage
    data class SocialLoginUnavailable(val provider: String) : AuthUiMessage
}
