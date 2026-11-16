package br.com.horautil.ui.components

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.statusBarsPadding
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.text.font.FontWeight
import br.com.horautil.R
import br.com.horautil.ui.theme.HeaderBrand
import br.com.horautil.ui.theme.HoraUtilDimens
import br.com.horautil.ui.theme.HoraUtilOnboardingTitle
import br.com.horautil.ui.theme.OnHeader
import br.com.horautil.ui.theme.OnHeaderSub

@Composable
fun OnboardingHeader(
    step: Int,
    totalSteps: Int,
    title: String,
    subtitle: String,
    modifier: Modifier = Modifier,
) {
    Column(
        modifier = modifier
            .fillMaxWidth()
            .statusBarsPadding()
            .padding(
                start = HoraUtilDimens.OnboardingHeaderHorizontalPadding,
                end = HoraUtilDimens.OnboardingHeaderHorizontalPadding,
                top = HoraUtilDimens.OnboardingHeaderTopPadding,
                bottom = HoraUtilDimens.OnboardingHeaderBottomPadding,
            ),
        verticalArrangement = Arrangement.spacedBy(HoraUtilDimens.OnboardingHeaderGap),
    ) {
        Text(
            text = stringResource(R.string.onboarding_step, step, totalSteps),
            style = MaterialTheme.typography.labelSmall.copy(fontWeight = FontWeight.Bold),
            color = HeaderBrand,
        )
        Text(
            text = title,
            style = HoraUtilOnboardingTitle,
            color = OnHeader,
        )
        Text(
            text = subtitle,
            style = MaterialTheme.typography.bodySmall.copy(fontWeight = FontWeight.Normal),
            color = OnHeaderSub,
        )
    }
}
