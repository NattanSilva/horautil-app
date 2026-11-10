package br.com.horautil.ui.components

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.BoxScope
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.WindowInsets
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.imePadding
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Snackbar
import androidx.compose.material3.SnackbarHost
import androidx.compose.material3.SnackbarHostState
import androidx.compose.material3.Surface
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import br.com.horautil.ui.theme.Card
import br.com.horautil.ui.theme.HeaderGradient
import br.com.horautil.ui.theme.HoraUtilDimens
import br.com.horautil.ui.theme.OnHeader
import br.com.horautil.ui.theme.TextPrimary

@Composable
fun AuthScaffold(
    snackbarHostState: SnackbarHostState,
    header: @Composable () -> Unit,
    content: @Composable BoxScope.() -> Unit,
) {
    Scaffold(
        containerColor = Color.Transparent,
        contentWindowInsets = WindowInsets(0, 0, 0, 0),
        snackbarHost = {
            SnackbarHost(hostState = snackbarHostState) { data ->
                Snackbar(
                    snackbarData = data,
                    containerColor = TextPrimary,
                    contentColor = OnHeader,
                    shape = RoundedCornerShape(HoraUtilDimens.SnackbarCornerRadius),
                )
            }
        },
    ) { innerPadding ->
        Column(
            modifier = Modifier
                .fillMaxSize()
                .background(HeaderGradient)
                .padding(innerPadding)
                .imePadding(),
        ) {
            header()

            Surface(
                modifier = Modifier
                    .weight(1f)
                    .fillMaxWidth(),
                color = Card,
                shape = RoundedCornerShape(
                    topStart = HoraUtilDimens.BodyCornerRadius,
                    topEnd = HoraUtilDimens.BodyCornerRadius,
                ),
            ) {
                Box(
                    modifier = Modifier.fillMaxSize(),
                    content = content,
                )
            }
        }
    }
}
