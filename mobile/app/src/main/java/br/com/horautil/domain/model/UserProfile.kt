package br.com.horautil.domain.model

data class UserProfile(
    val name: String,
    val initials: String,
    val bio: String,
    val teaches: List<String>,
    val wants: List<String>,
    val rating: String,
    val completedLessons: Int,
    val memberSince: String,
    val palette: HomePalette,
)
