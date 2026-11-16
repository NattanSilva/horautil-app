package br.com.horautil.domain.model

data class Review(
    val bookingId: String,
    val rating: Int,
    val comment: String,
)
