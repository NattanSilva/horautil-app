package br.com.horautil.ui.screens.auth

import androidx.annotation.StringRes
import androidx.compose.runtime.Composable
import androidx.compose.ui.res.stringResource
import br.com.horautil.R
import br.com.horautil.domain.model.AuthFieldError
import br.com.horautil.viewmodel.AuthUiMessage

@StringRes
fun AuthFieldError.messageRes(): Int = when (this) {
    AuthFieldError.NAME_REQUIRED -> R.string.error_name_required
    AuthFieldError.EMAIL_REQUIRED -> R.string.error_email_required
    AuthFieldError.EMAIL_INVALID -> R.string.error_email_invalid
    AuthFieldError.PHONE_INVALID -> R.string.error_phone_invalid
    AuthFieldError.PASSWORD_REQUIRED -> R.string.error_password_required
    AuthFieldError.PASSWORD_TOO_SHORT -> R.string.error_password_short
    AuthFieldError.PASSWORD_MISMATCH -> R.string.error_password_mismatch
    AuthFieldError.TERMS_REQUIRED -> R.string.error_terms_required
}

@Composable
fun AuthUiMessage.messageText(): String = when (this) {
    AuthUiMessage.LoginSuccess -> stringResource(R.string.login_success)
    AuthUiMessage.LoginFailed -> stringResource(R.string.login_failed)
    AuthUiMessage.RegisterFailed -> stringResource(R.string.register_failed)
    AuthUiMessage.ForgotPasswordUnavailable -> stringResource(R.string.forgot_password_unavailable)
    is AuthUiMessage.SocialLoginUnavailable -> {
        stringResource(R.string.social_login_unavailable, provider)
    }
}
