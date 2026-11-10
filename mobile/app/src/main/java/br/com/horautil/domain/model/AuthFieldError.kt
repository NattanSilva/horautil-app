package br.com.horautil.domain.model

enum class AuthFieldError {
    NAME_REQUIRED,
    EMAIL_REQUIRED,
    EMAIL_INVALID,
    PHONE_INVALID,
    PASSWORD_REQUIRED,
    PASSWORD_TOO_SHORT,
    PASSWORD_MISMATCH,
    TERMS_REQUIRED,
}
