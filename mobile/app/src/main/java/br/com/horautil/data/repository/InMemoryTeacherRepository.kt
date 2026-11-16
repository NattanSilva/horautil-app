package br.com.horautil.data.repository

import br.com.horautil.domain.model.AvailabilityDay
import br.com.horautil.domain.model.BookingIcon
import br.com.horautil.domain.model.HomePalette
import br.com.horautil.domain.model.TeacherAvailability
import br.com.horautil.domain.model.TeacherDetail
import br.com.horautil.domain.model.TeacherProfile
import br.com.horautil.domain.repository.TeacherRepository

class InMemoryTeacherRepository : TeacherRepository {

    override suspend fun getTeacher(teacherId: String): Result<TeacherDetail> {
        val teacher = teachers[teacherId]
            ?: return Result.failure(NoSuchElementException("Professor não encontrado"))
        return Result.success(TeacherDetail(profile = teacher, availability = availability()))
    }

    private fun availability() = TeacherAvailability(
        monthLabel = "Outubro 2026",
        weekdays = listOf("Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"),
        days = listOf(
            AvailabilityDay(dayOfMonth = 27, enabled = false),
            AvailabilityDay(dayOfMonth = 28, enabled = false),
            AvailabilityDay(dayOfMonth = 29, enabled = false),
            AvailabilityDay(dayOfMonth = 30, enabled = false),
            AvailabilityDay(dayOfMonth = 1),
            AvailabilityDay(dayOfMonth = 2, isToday = true),
            AvailabilityDay(dayOfMonth = 3),
            AvailabilityDay(dayOfMonth = 4),
            AvailabilityDay(dayOfMonth = 5),
            AvailabilityDay(dayOfMonth = 6),
            AvailabilityDay(dayOfMonth = 7),
            AvailabilityDay(dayOfMonth = 8),
            AvailabilityDay(dayOfMonth = 9),
            AvailabilityDay(dayOfMonth = 10),
            AvailabilityDay(dayOfMonth = 11),
            AvailabilityDay(dayOfMonth = 12),
            AvailabilityDay(dayOfMonth = 13),
            AvailabilityDay(dayOfMonth = 14),
            AvailabilityDay(dayOfMonth = 15),
            AvailabilityDay(dayOfMonth = 16),
            AvailabilityDay(dayOfMonth = 17),
            AvailabilityDay(dayOfMonth = 18),
            AvailabilityDay(dayOfMonth = 19),
            AvailabilityDay(dayOfMonth = 20),
            AvailabilityDay(dayOfMonth = 21),
            AvailabilityDay(dayOfMonth = 22),
            AvailabilityDay(dayOfMonth = 23),
            AvailabilityDay(dayOfMonth = 24),
            AvailabilityDay(dayOfMonth = 25),
            AvailabilityDay(dayOfMonth = 26),
            AvailabilityDay(dayOfMonth = 27),
            AvailabilityDay(dayOfMonth = 28),
            AvailabilityDay(dayOfMonth = 29),
            AvailabilityDay(dayOfMonth = 30),
            AvailabilityDay(dayOfMonth = 31),
        ),
        slots = listOf("09:00", "14:00", "18:30"),
        durations = listOf(30, 60, 90),
        defaultDay = 6,
        defaultSlot = "14:00",
        defaultDuration = 60,
    )

    private companion object {
        val teachers = mapOf(
            "ana-paula" to TeacherProfile(
                id = "ana-paula",
                name = "Ana Paula",
                initials = "AP",
                rating = "4,9",
                classesCount = 32,
                headline = "Violão",
                bio = "Professora de violão há 8 anos. Aulas práticas, do primeiro acorde ao repertório que você quer tocar.",
                teaches = listOf("Violão", "Música"),
                wants = listOf("Inglês"),
                palette = HomePalette.PINK,
                icon = BookingIcon.MUSIC,
            ),
            "carlos-m" to TeacherProfile(
                id = "carlos-m",
                name = "Carlos M.",
                initials = "CM",
                rating = "4,8",
                classesCount = 47,
                headline = "Programação",
                bio = "Desenvolvedor backend e mentor de carreira. Ensina programação com projetos reais e revisão de código.",
                teaches = listOf("Programação", "Tech"),
                wants = listOf("Fotografia"),
                palette = HomePalette.CYAN,
                icon = BookingIcon.TECH,
            ),
            "julia-r" to TeacherProfile(
                id = "julia-r",
                name = "Júlia R.",
                initials = "JR",
                rating = "5,0",
                classesCount = 21,
                headline = "Yoga",
                bio = "Instrutora de yoga e fotógrafa amadora. Aulas focadas em respiração, postura e bem-estar para o dia a dia.",
                teaches = listOf("Yoga", "Fotografia"),
                wants = listOf("Inglês"),
                palette = HomePalette.GREEN,
                icon = BookingIcon.YOGA,
            ),
            "pedro-h" to TeacherProfile(
                id = "pedro-h",
                name = "Pedro H.",
                initials = "PH",
                rating = "4,7",
                classesCount = 15,
                headline = "Culinária",
                bio = "Cozinheiro autodidata. Ensina receitas práticas do dia a dia e quer entrar no mundo da programação.",
                teaches = listOf("Culinária", "Piano"),
                wants = listOf("Programação"),
                palette = HomePalette.BLUE,
                icon = BookingIcon.ART,
            ),
            "luiza-f" to TeacherProfile(
                id = "luiza-f",
                name = "Luiza F.",
                initials = "LF",
                rating = "4,9",
                classesCount = 26,
                headline = "Inglês",
                bio = "Professora de inglês com vivência no exterior. Conversação desde o primeiro encontro, sem medo de errar.",
                teaches = listOf("Inglês", "Espanhol"),
                wants = listOf("Violão"),
                palette = HomePalette.AMBER,
                icon = BookingIcon.LANGUAGES,
            ),
        )
    }
}
