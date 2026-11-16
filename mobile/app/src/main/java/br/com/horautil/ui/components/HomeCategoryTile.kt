package br.com.horautil.ui.components

import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.rounded.Code
import androidx.compose.material.icons.rounded.MusicNote
import androidx.compose.material.icons.rounded.SportsTennis
import androidx.compose.material.icons.rounded.Translate
import androidx.compose.material3.Icon
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.semantics.Role
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.text.style.TextOverflow
import br.com.horautil.domain.model.HomeCategory
import br.com.horautil.domain.model.HomeCategoryIcon
import br.com.horautil.ui.theme.HoraUtilDimens
import br.com.horautil.ui.theme.TextPrimary

@Composable
fun HomeCategoryTile(
    category: HomeCategory,
    onClick: () -> Unit,
    modifier: Modifier = Modifier,
) {
    val palette = category.palette.colors()

    Column(
        modifier = modifier
            .clip(RoundedCornerShape(HoraUtilDimens.HomeCategoryIconBgCorner))
            .clickable(role = Role.Button, onClick = onClick),
        horizontalAlignment = Alignment.CenterHorizontally,
    ) {
        Box(
            modifier = Modifier
                .size(HoraUtilDimens.HomeCategoryIconBgSize)
                .clip(RoundedCornerShape(HoraUtilDimens.HomeCategoryIconBgCorner))
                .background(palette.background),
            contentAlignment = Alignment.Center,
        ) {
            Icon(
                imageVector = category.icon.imageVector(),
                contentDescription = null,
                tint = palette.foreground,
                modifier = Modifier.size(HoraUtilDimens.HomeCategoryIconSize),
            )
        }

        Spacer(modifier = Modifier.height(HoraUtilDimens.HomeCategoryLabelGap))

        Text(
            text = category.label,
            style = MaterialTheme.typography.labelSmall.copy(fontWeight = FontWeight.SemiBold),
            color = TextPrimary,
            textAlign = TextAlign.Center,
            maxLines = 1,
            overflow = TextOverflow.Ellipsis,
        )
    }
}

private fun HomeCategoryIcon.imageVector(): ImageVector = when (this) {
    HomeCategoryIcon.MUSIC -> Icons.Rounded.MusicNote
    HomeCategoryIcon.TECH -> Icons.Rounded.Code
    HomeCategoryIcon.LANGUAGES -> Icons.Rounded.Translate
    HomeCategoryIcon.SPORTS -> Icons.Rounded.SportsTennis
}
