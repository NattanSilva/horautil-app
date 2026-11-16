package br.com.horautil.domain.model

enum class BookingStatus {
    PENDING,
    ACCEPTED,
    COMPLETED,
    DECLINED,
    CANCELLED,
}

enum class BookingIcon {
    MUSIC,
    LANGUAGES,
    TECH,
    SPORTS,
    YOGA,
    ART,
}

data class Booking(
    val id: String,
    val teacherId: String,
    val teacherName: String,
    val teacherInitials: String,
    val skill: String,
    val dateLabel: String,
    val timeLabel: String,
    val durationMinutes: Int,
    val status: BookingStatus,
    val icon: BookingIcon,
    val palette: HomePalette,
    val reviewed: Boolean = false,
)

data class BookingRequest(
    val teacher: TeacherProfile,
    val dateLabel: String,
    val timeLabel: String,
    val durationMinutes: Int,
)
