package br.com.horautil.data.repository

import br.com.horautil.domain.model.AppNotification
import br.com.horautil.domain.model.HomePalette
import br.com.horautil.domain.model.NotificationAction
import br.com.horautil.domain.model.NotificationType
import br.com.horautil.domain.repository.NotificationRepository
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.update

class InMemoryNotificationRepository : NotificationRepository {

    private val notifications = MutableStateFlow(seed())

    override fun observeNotifications(): Flow<List<AppNotification>> = notifications.asStateFlow()

    override suspend fun markAsRead(id: String): Result<Unit> {
        notifications.update { current ->
            current.map { notification ->
                if (notification.id == id) notification.copy(isRead = true) else notification
            }
        }
        return Result.success(Unit)
    }

    override suspend fun markAllAsRead(): Result<Unit> {
        notifications.update { current -> current.map { it.copy(isRead = true) } }
        return Result.success(Unit)
    }

    private fun seed() = listOf(
        AppNotification(
            id = "notif-req-beatriz",
            title = "Solicitação de aula recebida",
            message = "Beatriz S. quer agendar uma aula de Espanhol com você.",
            timeLabel = "Agora",
            type = NotificationType.LESSON_REQUEST,
            isRead = false,
            palette = HomePalette.PINK,
            action = NotificationAction.OPEN_AGENDA_PENDING,
            bookingId = "booking-beatriz-pendente",
        ),
        AppNotification(
            id = "notif-confirm-marcos",
            title = "Agendamento confirmado",
            message = "Seu agendamento com Marcos A. foi confirmado para amanhã às 16:30.",
            timeLabel = "Há 15 min",
            type = NotificationType.BOOKING_CONFIRMED,
            isRead = false,
            palette = HomePalette.BLUE,
            action = NotificationAction.OPEN_AGENDA_ACCEPTED,
            bookingId = "booking-marcos-amanha",
        ),
        AppNotification(
            id = "notif-review-pedro",
            title = "Avaliação recebida",
            message = "Pedro H. avaliou sua aula com 5 estrelas. Você ganhou +1h na carteira.",
            timeLabel = "Hoje, 09:12",
            type = NotificationType.REVIEW_RECEIVED,
            isRead = false,
            palette = HomePalette.AMBER,
            action = NotificationAction.OPEN_WALLET,
        ),
        AppNotification(
            id = "notif-credit-julia",
            title = "Crédito liberado",
            message = "+1h foi creditada na sua carteira pela aula de Yoga com Júlia R.",
            timeLabel = "Ontem",
            type = NotificationType.CREDIT_RELEASED,
            isRead = true,
            palette = HomePalette.GREEN,
            action = NotificationAction.OPEN_WALLET,
        ),
        AppNotification(
            id = "notif-req-rafael",
            title = "Nova solicitação de aula",
            message = "Rafael T. quer agendar uma aula de Natação com você.",
            timeLabel = "Ontem",
            type = NotificationType.LESSON_REQUEST,
            isRead = true,
            palette = HomePalette.CYAN,
            action = NotificationAction.OPEN_AGENDA_PENDING,
            bookingId = "booking-rafael-pendente",
        ),
    )
}
