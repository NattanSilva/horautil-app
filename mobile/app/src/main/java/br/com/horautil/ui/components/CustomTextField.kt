package br.com.horautil.ui.components

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.text.BasicTextField
import androidx.compose.foundation.text.KeyboardActions
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.rounded.Visibility
import androidx.compose.material.icons.rounded.VisibilityOff
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.SolidColor
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.text.input.VisualTransformation
import br.com.horautil.R
import br.com.horautil.ui.theme.ErrorBg
import br.com.horautil.ui.theme.ErrorText
import br.com.horautil.ui.theme.HoraUtilDimens
import br.com.horautil.ui.theme.Page
import br.com.horautil.ui.theme.Primary
import br.com.horautil.ui.theme.TextPrimary
import br.com.horautil.ui.theme.TextSecondary

@Composable
fun CustomTextField(
    value: String,
    onValueChange: (String) -> Unit,
    label: String,
    placeholder: String,
    modifier: Modifier = Modifier,
    error: String? = null,
    keyboardOptions: KeyboardOptions = KeyboardOptions.Default,
    keyboardActions: KeyboardActions = KeyboardActions.Default,
    visualTransformation: VisualTransformation = VisualTransformation.None,
    isPassword: Boolean = false,
    passwordVisible: Boolean = false,
    onTogglePasswordVisibility: (() -> Unit)? = null,
    enabled: Boolean = true,
) {
    Column(modifier = modifier) {
        Text(
            text = label,
            style = MaterialTheme.typography.labelMedium,
            color = TextPrimary,
        )

        Spacer(modifier = Modifier.height(HoraUtilDimens.FieldLabelGap))

        BasicTextField(
            value = value,
            onValueChange = onValueChange,
            modifier = Modifier.fillMaxWidth(),
            enabled = enabled,
            singleLine = true,
            textStyle = MaterialTheme.typography.bodyLarge.copy(color = TextPrimary),
            cursorBrush = SolidColor(Primary),
            keyboardOptions = keyboardOptions,
            keyboardActions = keyboardActions,
            visualTransformation = visualTransformation,
            decorationBox = { innerTextField ->
                Row(
                    modifier = Modifier
                        .fillMaxWidth()
                        .height(HoraUtilDimens.InputMinHeight)
                        .clip(RoundedCornerShape(HoraUtilDimens.InputCornerRadius))
                        .background(if (error != null) ErrorBg else Page)
                        .padding(
                            start = HoraUtilDimens.InputHorizontalPadding,
                            end = if (isPassword) {
                                HoraUtilDimens.InputEndPaddingPassword
                            } else {
                                HoraUtilDimens.InputHorizontalPadding
                            },
                        ),
                    verticalAlignment = Alignment.CenterVertically,
                ) {
                    Box(modifier = Modifier.weight(1f)) {
                        if (value.isEmpty()) {
                            Text(
                                text = placeholder,
                                style = MaterialTheme.typography.bodyLarge,
                                color = TextSecondary,
                                maxLines = 1,
                            )
                        }
                        innerTextField()
                    }

                    if (isPassword && onTogglePasswordVisibility != null) {
                        IconButton(
                            onClick = onTogglePasswordVisibility,
                            modifier = Modifier.size(HoraUtilDimens.TouchTarget),
                        ) {
                            Icon(
                                imageVector = if (passwordVisible) {
                                    Icons.Rounded.VisibilityOff
                                } else {
                                    Icons.Rounded.Visibility
                                },
                                contentDescription = stringResource(
                                    if (passwordVisible) {
                                        R.string.hide_password
                                    } else {
                                        R.string.show_password
                                    },
                                ),
                                tint = TextSecondary,
                                modifier = Modifier.size(HoraUtilDimens.PasswordIconSize),
                            )
                        }
                    }
                }
            },
        )

        if (error != null) {
            Spacer(modifier = Modifier.height(HoraUtilDimens.FieldErrorGap))
            Text(
                text = error,
                style = MaterialTheme.typography.labelSmall,
                color = ErrorText,
            )
        }
    }
}
