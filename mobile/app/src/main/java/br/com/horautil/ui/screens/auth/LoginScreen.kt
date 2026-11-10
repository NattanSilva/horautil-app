package br.com.horautil.ui.screens.auth

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.heightIn
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.text.KeyboardActions
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.foundation.verticalScroll
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.SnackbarHostState
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.remember
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.focus.FocusDirection
import androidx.compose.ui.platform.LocalFocusManager
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.text.input.ImeAction
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.text.input.PasswordVisualTransformation
import androidx.compose.ui.text.input.VisualTransformation
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import androidx.lifecycle.viewmodel.compose.viewModel
import br.com.horautil.R
import br.com.horautil.ui.components.AppHeader
import br.com.horautil.ui.components.AuthDivider
import br.com.horautil.ui.components.AuthFooterLink
import br.com.horautil.ui.components.AuthScaffold
import br.com.horautil.ui.components.CustomTextField
import br.com.horautil.ui.components.PrimaryButton
import br.com.horautil.ui.components.SocialButton
import br.com.horautil.ui.theme.HoraUtilDimens
import br.com.horautil.ui.theme.Primary
import br.com.horautil.viewmodel.LoginUiState
import br.com.horautil.viewmodel.LoginViewModel

@Composable
fun LoginRoute(
    registerSuccess: Boolean,
    onRegisterSuccessShown: () -> Unit,
    onRegisterClick: () -> Unit,
    viewModel: LoginViewModel = viewModel(factory = LoginViewModel.Factory),
) {
    val state by viewModel.uiState.collectAsStateWithLifecycle()
    val snackbarHostState = remember { SnackbarHostState() }
    val messageText = state.message?.messageText()
    val registerSuccessMessage = stringResource(R.string.register_success)

    LaunchedEffect(state.message) {
        if (messageText != null) {
            snackbarHostState.showSnackbar(messageText)
            viewModel.onMessageShown()
        }
    }

    LaunchedEffect(Unit) {
        if (registerSuccess) {
            onRegisterSuccessShown()
            snackbarHostState.showSnackbar(registerSuccessMessage)
        }
    }

    LoginScreen(
        state = state,
        snackbarHostState = snackbarHostState,
        onEmailChange = viewModel::onEmailChange,
        onPasswordChange = viewModel::onPasswordChange,
        onTogglePasswordVisibility = viewModel::onTogglePasswordVisibility,
        onForgotPasswordClick = viewModel::onForgotPasswordClick,
        onSocialLoginClick = viewModel::onSocialLoginClick,
        onSubmit = viewModel::submit,
        onRegisterClick = onRegisterClick,
    )
}

@Composable
fun LoginScreen(
    state: LoginUiState,
    snackbarHostState: SnackbarHostState,
    onEmailChange: (String) -> Unit,
    onPasswordChange: (String) -> Unit,
    onTogglePasswordVisibility: () -> Unit,
    onForgotPasswordClick: () -> Unit,
    onSocialLoginClick: (String) -> Unit,
    onSubmit: () -> Unit,
    onRegisterClick: () -> Unit,
) {
    val focusManager = LocalFocusManager.current
    val googleLabel = stringResource(R.string.google)
    val appleLabel = stringResource(R.string.apple)

    AuthScaffold(
        snackbarHostState = snackbarHostState,
        header = {
            AppHeader(
                title = stringResource(R.string.login_title),
                subtitle = stringResource(R.string.login_subtitle),
                brand = stringResource(R.string.brand),
            )
        },
    ) {
        Column(
            modifier = Modifier
                .fillMaxSize()
                .verticalScroll(rememberScrollState())
                .padding(horizontal = HoraUtilDimens.ScreenHorizontalPadding)
                .padding(top = HoraUtilDimens.BodyTopPaddingLogin)
                .padding(bottom = HoraUtilDimens.LoginContentBottomPadding),
            verticalArrangement = Arrangement.spacedBy(HoraUtilDimens.SpaceLarge),
        ) {
            CustomTextField(
                value = state.email,
                onValueChange = onEmailChange,
                label = stringResource(R.string.email_label),
                placeholder = stringResource(R.string.email_placeholder),
                error = state.emailError?.let { stringResource(it.messageRes()) },
                keyboardOptions = KeyboardOptions(
                    keyboardType = KeyboardType.Email,
                    imeAction = ImeAction.Next,
                ),
                keyboardActions = KeyboardActions(
                    onNext = { focusManager.moveFocus(FocusDirection.Down) },
                ),
            )

            CustomTextField(
                value = state.password,
                onValueChange = onPasswordChange,
                label = stringResource(R.string.password_label),
                placeholder = stringResource(R.string.password_placeholder),
                error = state.passwordError?.let { stringResource(it.messageRes()) },
                visualTransformation = if (state.isPasswordVisible) {
                    VisualTransformation.None
                } else {
                    PasswordVisualTransformation()
                },
                isPassword = true,
                passwordVisible = state.isPasswordVisible,
                onTogglePasswordVisibility = onTogglePasswordVisibility,
                keyboardOptions = KeyboardOptions(
                    keyboardType = KeyboardType.Password,
                    imeAction = ImeAction.Done,
                ),
                keyboardActions = KeyboardActions(
                    onDone = {
                        focusManager.clearFocus()
                        onSubmit()
                    },
                ),
            )

            TextButton(
                onClick = onForgotPasswordClick,
                modifier = Modifier
                    .align(Alignment.End)
                    .heightIn(min = HoraUtilDimens.TouchTarget),
                contentPadding = PaddingValues(horizontal = HoraUtilDimens.SpaceQuarter),
            ) {
                Text(
                    text = stringResource(R.string.forgot_password),
                    style = MaterialTheme.typography.labelMedium,
                    color = Primary,
                )
            }

            PrimaryButton(
                text = stringResource(R.string.login_cta),
                onClick = onSubmit,
                enabled = !state.isSubmitting,
                loading = state.isSubmitting,
            )

            AuthDivider(text = stringResource(R.string.auth_divider))

            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.spacedBy(HoraUtilDimens.SocialGap),
            ) {
                SocialButton(
                    label = googleLabel,
                    onClick = { onSocialLoginClick(googleLabel) },
                    modifier = Modifier.weight(1f),
                )
                SocialButton(
                    label = appleLabel,
                    onClick = { onSocialLoginClick(appleLabel) },
                    modifier = Modifier.weight(1f),
                )
            }
        }

        AuthFooterLink(
            prefix = stringResource(R.string.no_account),
            action = stringResource(R.string.sign_up),
            onClick = onRegisterClick,
            modifier = Modifier.align(Alignment.BottomCenter),
        )
    }
}
