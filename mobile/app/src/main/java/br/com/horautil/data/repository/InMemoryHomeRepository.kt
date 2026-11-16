package br.com.horautil.data.repository

import br.com.horautil.domain.model.HomeCategory
import br.com.horautil.domain.model.HomeCategoryIcon
import br.com.horautil.domain.model.HomeFeed
import br.com.horautil.domain.model.HomeMatch
import br.com.horautil.domain.model.HomePalette
import br.com.horautil.domain.repository.HomeRepository
import br.com.horautil.domain.repository.UserProfileRepository
import br.com.horautil.domain.repository.WalletRepository
import java.util.Locale
import kotlin.math.floor

class InMemoryHomeRepository(
    private val userProfileRepository: UserProfileRepository,
    private val walletRepository: WalletRepository,
) : HomeRepository {

    override suspend fun getHomeFeed(): Result<HomeFeed> {
        val profile = userProfileRepository.getProfile().getOrElse { return Result.failure(it) }
        val wallet = walletRepository.getSummary().getOrElse { return Result.failure(it) }

        return Result.success(
            HomeFeed(
                userName = profile.name.substringBefore(" "),
                userInitials = profile.initials,
                availableBalance = "${formatHours(wallet.availableHours)} h",
                categories = categories(),
                matches = matches(),
            ),
        )
    }

    private fun categories() = listOf(
        HomeCategory(
            id = "music",
            label = "Música",
            icon = HomeCategoryIcon.MUSIC,
            palette = HomePalette.RED,
        ),
        HomeCategory(
            id = "tech",
            label = "Tech",
            icon = HomeCategoryIcon.TECH,
            palette = HomePalette.BLUE,
        ),
        HomeCategory(
            id = "languages",
            label = "Idiomas",
            icon = HomeCategoryIcon.LANGUAGES,
            palette = HomePalette.GREEN,
        ),
        HomeCategory(
            id = "sports",
            label = "Esporte",
            icon = HomeCategoryIcon.SPORTS,
            palette = HomePalette.AMBER,
        ),
    )

    private fun matches() = listOf(
        HomeMatch(
            id = "ana-paula",
            name = "Ana Paula",
            initials = "AP",
            teaches = "violão",
            wants = "inglês",
            matchPercent = 95,
            rating = "4,9",
            palette = HomePalette.PINK,
        ),
        HomeMatch(
            id = "carlos-m",
            name = "Carlos M.",
            initials = "CM",
            teaches = "programação",
            wants = "fotografia",
            matchPercent = 95,
            rating = "4,8",
            palette = HomePalette.CYAN,
        ),
        HomeMatch(
            id = "julia-r",
            name = "Júlia R.",
            initials = "JR",
            teaches = "yoga",
            wants = "fotografia",
            matchPercent = 88,
            rating = "5,0",
            palette = HomePalette.GREEN,
        ),
        HomeMatch(
            id = "pedro-h",
            name = "Pedro H.",
            initials = "PH",
            teaches = "culinária",
            wants = "programação",
            matchPercent = 82,
            rating = "4,7",
            palette = HomePalette.BLUE,
        ),
        HomeMatch(
            id = "luiza-f",
            name = "Luiza F.",
            initials = "LF",
            teaches = "inglês",
            wants = "violão",
            matchPercent = 76,
            rating = "4,9",
            palette = HomePalette.AMBER,
        ),
    )

    private fun formatHours(hours: Double): String {
        val locale = Locale.forLanguageTag("pt-BR")
        return if (hours == floor(hours)) {
            String.format(locale, "%.0f", hours)
        } else {
            String.format(locale, "%.1f", hours)
        }
    }
}
