package br.com.horautil.domain.model

data class TeacherProfile(
    val id: String,
    val name: String,
    val initials: String,
    val rating: String,
    val classesCount: Int,
    val headline: String,
    val bio: String,
    val teaches: List<String>,
    val wants: List<String>,
    val palette: HomePalette,
    val icon: BookingIcon,
)

data class AvailabilityDay(
    val dayOfMonth: Int,
    val enabled: Boolean = true,
    val isToday: Boolean = false,
)

data class TeacherAvailability(
    val monthLabel: String,
    val weekdays: List<String>,
    val days: List<AvailabilityDay>,
    val slots: List<String>,
    val durations: List<Int>,
    val defaultDay: Int,
    val defaultSlot: String,
    val defaultDuration: Int,
)

data class TeacherDetail(
    val profile: TeacherProfile,
    val availability: TeacherAvailability,
)
