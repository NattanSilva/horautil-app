package br.com.horautil.data.repository

import br.com.horautil.domain.model.HomePalette
import br.com.horautil.domain.model.UserProfile
import br.com.horautil.domain.repository.UserProfileRepository
import kotlinx.coroutines.flow.MutableStateFlow

class InMemoryUserProfileRepository : UserProfileRepository {

    private val profile = MutableStateFlow(
        UserProfile(
            name = "Maria Silva",
            initials = "MS",
            bio = "Apaixonada por música e tecnologia. Dou aulas de violão e programação nas horas livres e estou sempre em busca de uma nova habilidade para aprender.",
            teaches = listOf("Violão", "Programação", "Yoga"),
            wants = listOf("Culinária", "Piano", "Inglês"),
            rating = "4,9",
            completedLessons = 18,
            memberSince = "Março de 2026",
            palette = HomePalette.PINK,
        ),
    )

    override suspend fun getProfile(): Result<UserProfile> = Result.success(profile.value)

    override suspend fun updateSkills(
        teaches: List<String>,
        wants: List<String>,
    ): Result<Unit> {
        profile.value = profile.value.copy(
            teaches = teaches.distinct(),
            wants = wants.distinct(),
        )
        return Result.success(Unit)
    }
}
