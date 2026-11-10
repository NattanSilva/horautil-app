package br.com.horautil.ui.screens.auth

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.text.KeyboardActions
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.foundation.verticalScroll
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.SnackbarHostState
import androidx.compose.material3.Text
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
import androidx.compose.ui.text.input.KeyboardCapitalization
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.text.input.PasswordVisualTransformation
import androidx.compose.ui.text.input.VisualTransformation
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import androidx.lifecycle.viewmodel.compose.viewModel
import br.com.horautil.R
import br.com.horautil.ui.components.AppHeader
import br.com.horautil.ui.components.AuthFooterLink
import br.com.horautil.ui.components.AuthScaffold
import br.com.horautil.ui.components.CustomTextField
import br.com.horautil.ui.components.PhoneVisualTransformation
import br.com.horautil.ui.components.PrimaryButton
import br.com.horautil.ui.components.TermsCheckbox
import br.com.horautil.ui.theme.HoraUtilDimens
import br.com.horautil.ui.theme.TextSecondary
import br.com.horautil.viewmodel.RegisterUiState
import br.com.horautil.viewmodel.RegisterViewModel

@Composable
fun RegisterRoute(
    onBack: () -> Unit,
    onSignInClick: () -> Unit,
    onRegistrationSuccess: () -> Unit,
    viewModel: RegisterViewModel = viewModel(factory = RegisterViewModel.Factory),
) {
    val state by viewModel.uiState.collectAsStateWithLifecycle()
    val snackbarHostState = remember { SnackbarHostState() }
    val messageText = state.message?.messageText()

    LaunchedEffect(state.message) {
        if (messageText != null) {
            snackbarHostState.showSnackbar(messageText)
            viewModel.onMessageShown()
        }
    }

    LaunchedEffect(state.registrationSucceeded) {
        if (state.registrationSucceeded) {
            viewModel.onRegistrationHandled()
            onRegistrationSuccess()
        }
    }

    RegisterScreen(
        state = state,
        snackbarHostState = snackbarHostState,
        onBack = onBack,
        onFullNameChange = viewModel::onFullNameChange,
        onEmailChange = viewModel::onEmailChange,
        onPhoneChange = viewModel::onPhoneChange,
        onPasswordChange = viewModel::onPasswordChange,
        onConfirmPasswordChange = viewModel::onConfirmPasswordChange,
        onTogglePasswordVisibility = viewModel::onTogglePasswordVisibility,
        onToggleConfirmPasswordVisibility = viewModel::onToggleConfirmPasswordVisibility,
        onTermsChange = viewModel::onTermsChange,
        onSubmit = viewModel::submit,
        onSignInClick = onSignInClick,
    )
}

@Composable
fun RegisterScreen(
    state: RegisterUiState,
    snackbarHostState: SnackbarHostState,
    onBack: () -> Unit,
    onFullNameChange: (String) -> Unit,
    onEmailChange: (String) -> Unit,
    onPhoneChange: (String) -> Unit,
    onPasswordChange: (String) -> Unit,
    onConfirmPasswordChange: (String) -> Unit,
    onTogglePasswordVisibility: () -> Unit,
    onToggleConfirmPasswordVisibility: () -> Unit,
    onTermsChange: (Boolean) -> Unit,
    onSubmit: () -> Unit,
    onSignInClick: () -> Unit,
) {
    val focusManager = LocalFocusManager.current

    AuthScaffold(
        snackbarHostState = snackbarHostState,
        header = {
            AppHeader(
                title = stringResource(R.string.register_title),
                titleStyle = MaterialTheme.typography.titleLarge,
                onBack = onBack,
            )
        },
    ) {
        Column(
            modifier = Modifier
                .fillMaxSize()
                .verticalScroll(rememberScrollState())
                .padding(horizontal = HoraUtilDimens.ScreenHorizontalPadding)
                .padding(top = HoraUtilDimens.BodyTopPaddingRegister)
                .padding(bottom = HoraUtilDimens.RegisterContentBottomPadding),
            verticalArrangement = Arrangement.spacedBy(HoraUtilDimens.Space2),
        ) {
            Text(
                text = stringResource(R.string.register_subtitle),
                style = MaterialTheme.typography.bodySmall,
                color = TextSecondary,
            )

            CustomTextField(
                value = state.fullName,
                onValueChange = onFullNameChange,
                label = stringResource(R.string.full_name_label),
                placeholder = stringResource(R.string.full_name_placeholder),
                error = state.fullNameError?.let { stringResource(it.messageRes()) },
                keyboardOptions = KeyboardOptions(
                    capitalization = KeyboardCapitalization.Words,
                    keyboardType = KeyboardType.Text,
                    imeAction = ImeAction.Next,
                ),
                keyboardActions = KeyboardActions(
                    onNext = { focusManager.moveFocus(FocusDirection.Down) },
                ),
            )

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
                value = state.phone,
                onValueChange = onPhoneChange,
                label = stringResource(R.string.phone_label),
                placeholder = stringResource(R.string.phone_placeholder),
                error = state.phoneError?.let { stringResource(it.messageRes()) },
                visualTransformation = PhoneVisualTransformation(),
                keyboardOptions = KeyboardOptions(
                    keyboardType = KeyboardType.Phone,
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
                placeholder = stringResource(R.string.register_password_placeholder),
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
                    imeAction = ImeAction.Next,
                ),
                keyboardActions = KeyboardActions(
                    onNext = { focusManager.moveFocus(FocusDirection.Down) },
                ),
            )

            CustomTextField(
                value = state.confirmPassword,
                onValueChange = onConfirmPasswordChange,
                label = stringResource(R.string.confirm_password_label),
                placeholder = stringResource(R.string.confirm_password_placeholder),
                error = state.confirmPasswordError?.let { stringResource(it.messageRes()) },
                visualTransformation = if (state.isConfirmPasswordVisible) {
                    VisualTransformation.None
                } else {
                    PasswordVisualTransformation()
                },
                isPassword = true,
                passwordVisible = state.isConfirmPasswordVisible,
                onTogglePasswordVisibility = onToggleConfirmPasswordVisibility,
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

            TermsCheckbox(
                checked = state.acceptedTerms,
                onCheckedChange = onTermsChange,
                text = stringResource(R.string.terms),
                error = state.termsError?.let { stringResource(it.messageRes()) },
            )

            PrimaryButton(
                text = stringResource(R.string.register_cta),
                onClick = onSubmit,
                enabled = !state.isSubmitting,
                loading = state.isSubmitting,
            )
        }

        AuthFooterLink(
            prefix = stringResource(R.string.have_account),
            action = stringResource(R.string.sign_in),
            onClick = onSignInClick,
            modifier = Modifier.align(Alignment.BottomCenter),
        )
    }
}
