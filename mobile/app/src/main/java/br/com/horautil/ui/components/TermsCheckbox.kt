package br.com.horautil.ui.components

import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.heightIn
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.selection.toggleable
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.rounded.Check
import androidx.compose.material3.Icon
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.semantics.Role
import br.com.horautil.ui.theme.Divider
import br.com.horautil.ui.theme.ErrorText
import br.com.horautil.ui.theme.HoraUtilDimens
import br.com.horautil.ui.theme.OnHeader
import br.com.horautil.ui.theme.Page
import br.com.horautil.ui.theme.Primary
import br.com.horautil.ui.theme.TextSecondary

@Composable
fun TermsCheckbox(
    checked: Boolean,
    onCheckedChange: (Boolean) -> Unit,
    text: String,
    modifier: Modifier = Modifier,
    error: String? = null,
) {
    val checkboxShape = RoundedCornerShape(HoraUtilDimens.CheckboxCornerRadius)

    Column(modifier = modifier) {
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .heightIn(min = HoraUtilDimens.TouchTarget)
                .toggleable(
                    value = checked,
                    role = Role.Checkbox,
                    onValueChange = onCheckedChange,
                )
                .padding(vertical = HoraUtilDimens.SpaceQuarter),
            verticalAlignment = Alignment.CenterVertically,
            horizontalArrangement = Arrangement.spacedBy(HoraUtilDimens.TermsGap),
        ) {
            Box(
                modifier = Modifier
                    .size(HoraUtilDimens.CheckboxSize)
                    .clip(checkboxShape)
                    .background(if (checked) Primary else Page)
                    .border(
                        width = HoraUtilDimens.DividerThickness,
                        color = if (checked) Primary else Divider,
                        shape = checkboxShape,
                    ),
                contentAlignment = Alignment.Center,
            ) {
                if (checked) {
                    Icon(
                        imageVector = Icons.Rounded.Check,
                        contentDescription = null,
                        tint = OnHeader,
                        modifier = Modifier.size(HoraUtilDimens.CheckIconSize),
                    )
                }
            }

            Text(
                text = text,
                style = MaterialTheme.typography.bodySmall,
                color = TextSecondary,
            )
        }

        if (error != null) {
            Text(
                text = error,
                style = MaterialTheme.typography.labelSmall,
                color = ErrorText,
            )
        }
    }
}
