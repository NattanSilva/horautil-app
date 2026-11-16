package br.com.horautil.domain.model

enum class NotificationType {
    LESSON_REQUEST,
    BOOKING_CONFIRMED,
    REVIEW_RECEIVED,
    CREDIT_RELEASED,
}

enum class NotificationAction {
    OPEN_AGENDA_PENDING,
    OPEN_AGENDA_ACCEPTED,
    OPEN_WALLET,
    OPEN_REVIEW,
    NONE,
}

data class AppNotification(
    val id: String,
    val title: String,
    val message: String,
    val timeLabel: String,
    val type: NotificationType,
    val isRead: Boolean = false,
    val palette: HomePalette,
    val action: NotificationAction = NotificationAction.NONE,
    val bookingId: String? = null,
)
