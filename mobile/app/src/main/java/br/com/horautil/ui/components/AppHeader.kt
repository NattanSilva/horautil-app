package br.com.horautil.ui.components

import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.statusBarsPadding
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.rounded.ArrowBack
import androidx.compose.material3.Icon
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.semantics.Role
import androidx.compose.ui.text.TextStyle
import br.com.horautil.R
import br.com.horautil.ui.theme.HeaderBrand
import br.com.horautil.ui.theme.HeaderOverlay
import br.com.horautil.ui.theme.HoraUtilDimens
import br.com.horautil.ui.theme.OnHeader
import br.com.horautil.ui.theme.OnHeaderSub

@Composable
fun AppHeader(
    title: String,
    modifier: Modifier = Modifier,
    subtitle: String? = null,
    brand: String? = null,
    titleStyle: TextStyle = MaterialTheme.typography.headlineSmall,
    onBack: (() -> Unit)? = null,
) {
    val hasBack = onBack != null
    val horizontalPadding = if (hasBack) {
        HoraUtilDimens.HeaderHorizontalPaddingRegister
    } else {
        HoraUtilDimens.HeaderHorizontalPaddingLogin
    }
    val topPadding = if (hasBack) {
        HoraUtilDimens.HeaderTopPaddingRegister
    } else {
        HoraUtilDimens.HeaderTopPaddingLogin
    }
    val bottomPadding = if (hasBack) {
        HoraUtilDimens.HeaderBottomPaddingRegister
    } else {
        HoraUtilDimens.HeaderBottomPaddingLogin
    }

    Column(
        modifier = modifier
            .fillMaxWidth()
            .statusBarsPadding()
            .padding(
                start = horizontalPadding,
                end = horizontalPadding,
                top = topPadding,
                bottom = bottomPadding,
            ),
        verticalArrangement = Arrangement.spacedBy(
            if (hasBack) HoraUtilDimens.HeaderGapRegister else HoraUtilDimens.HeaderGapLogin,
        ),
    ) {
        if (brand != null) {
            Text(
                text = brand,
                style = MaterialTheme.typography.titleSmall,
                color = HeaderBrand,
            )
        }

        if (onBack != null) {
            Row(
                verticalAlignment = Alignment.CenterVertically,
                horizontalArrangement = Arrangement.spacedBy(HoraUtilDimens.HeaderGapRegister),
            ) {
                BackButton(onClick = onBack)
                Text(
                    text = title,
                    style = titleStyle,
                    color = OnHeader,
                )
            }
        } else {
            Text(
                text = title,
                style = titleStyle,
                color = OnHeader,
            )
        }

        if (subtitle != null) {
            Text(
                text = subtitle,
                style = MaterialTheme.typography.bodySmall,
                color = OnHeaderSub,
            )
        }
    }
}

@Composable
private fun BackButton(onClick: () -> Unit) {
    Box(
        modifier = Modifier
            .size(HoraUtilDimens.TouchTarget)
            .clickable(role = Role.Button, onClick = onClick),
        contentAlignment = Alignment.Center,
    ) {
        Box(
            modifier = Modifier
                .size(HoraUtilDimens.BackButtonSize)
                .clip(CircleShape)
                .background(HeaderOverlay),
            contentAlignment = Alignment.Center,
        ) {
            Icon(
                imageVector = Icons.AutoMirrored.Rounded.ArrowBack,
                contentDescription = stringResource(R.string.back),
                tint = OnHeader,
                modifier = Modifier.size(HoraUtilDimens.BackIconSize),
            )
        }
    }
}
