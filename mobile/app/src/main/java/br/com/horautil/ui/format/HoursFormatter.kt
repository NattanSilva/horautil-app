package br.com.horautil.ui.format

import java.util.Locale
import kotlin.math.abs
import kotlin.math.floor

private val ptBr: Locale = Locale.forLanguageTag("pt-BR")

fun formatHours(hours: Double): String = if (hours == floor(hours)) {
    String.format(ptBr, "%.0f", hours)
} else {
    String.format(ptBr, "%.1f", hours)
}

fun formatHoursFixed(hours: Double): String = String.format(ptBr, "%.1f", hours)

fun signedHours(hours: Double): String {
    val sign = if (hours >= 0) "+" else "-"
    return sign + formatHours(abs(hours)) + "h"
}
