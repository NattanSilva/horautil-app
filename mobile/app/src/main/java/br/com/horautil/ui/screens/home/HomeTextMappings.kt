package br.com.horautil.ui.screens.home

import androidx.compose.runtime.Composable
import androidx.compose.ui.res.stringResource
import br.com.horautil.R
import br.com.horautil.viewmodel.HomeUiMessage

@Composable
fun HomeUiMessage.toHomeMessageText(): String = when (this) {
    HomeUiMessage.ComingSoon -> stringResource(R.string.home_coming_soon)
}
