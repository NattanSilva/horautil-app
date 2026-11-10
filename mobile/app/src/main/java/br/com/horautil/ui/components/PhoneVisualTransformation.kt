package br.com.horautil.ui.components

import androidx.compose.ui.text.AnnotatedString
import androidx.compose.ui.text.input.OffsetMapping
import androidx.compose.ui.text.input.TransformedText
import androidx.compose.ui.text.input.VisualTransformation

class PhoneVisualTransformation : VisualTransformation {
    override fun filter(text: AnnotatedString): TransformedText {
        val digits = text.text.filter(Char::isDigit).take(MAX_DIGITS)
        val formatted = buildString {
            digits.forEachIndexed { index, char ->
                when (index) {
                    0 -> append('(')
                    2 -> append(") ")
                    7 -> append('-')
                }
                append(char)
            }
            if (digits.length == 2) append(')')
        }

        val transformedToOriginal = IntArray(formatted.length + 1)
        var digitsSeen = 0
        for (index in formatted.indices) {
            transformedToOriginal[index] = digitsSeen
            if (formatted[index].isDigit()) digitsSeen++
        }
        transformedToOriginal[formatted.length] = digitsSeen

        val originalToTransformed = IntArray(digits.length + 1)
        var transformedPosition = 0
        for (index in formatted.indices) {
            if (formatted[index].isDigit()) {
                transformedPosition = index + 1
                originalToTransformed[formatted.substring(0, index + 1).count(Char::isDigit)] =
                    transformedPosition
            }
        }
        originalToTransformed[0] = 0

        val offsetMapping = object : OffsetMapping {
            override fun originalToTransformed(offset: Int): Int {
                return originalToTransformed[offset.coerceIn(0, digits.length)]
            }

            override fun transformedToOriginal(offset: Int): Int {
                return transformedToOriginal[offset.coerceIn(0, formatted.length)]
            }
        }

        return TransformedText(AnnotatedString(formatted), offsetMapping)
    }

    private companion object {
        const val MAX_DIGITS = 11
    }
}
