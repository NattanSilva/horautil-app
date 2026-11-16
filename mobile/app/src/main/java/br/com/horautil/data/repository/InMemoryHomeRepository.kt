package br.com.horautil.data.repository

import br.com.horautil.domain.model.HomeCategory
import br.com.horautil.domain.model.HomeCategoryIcon
import br.com.horautil.domain.model.HomeFeed
import br.com.horautil.domain.model.HomeMatch
import br.com.horautil.domain.model.HomePalette
import br.com.horautil.domain.repository.HomeRepository

class InMemoryHomeRepository : HomeRepository {
    override suspend fun getHomeFeed(): Result<HomeFeed> = Result.success(
        HomeFeed(
            userName = "Maria",
            userInitials = "MS",
            availableBalance = "12,5 h",
            categories = listOf(
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
            ),
            matches = listOf(
                HomeMatch(
                    id = "ana-paula",
                    name = "Ana Paula",
                    initials = "AP",
                    teaches = "violão",
                    wants = "inglês",
                    matchPercent = 95,
                    palette = HomePalette.PINK,
                ),
                HomeMatch(
                    id = "carlos-m",
                    name = "Carlos M.",
                    initials = "CM",
                    teaches = "programação",
                    wants = "fotografia",
                    matchPercent = 95,
                    palette = HomePalette.CYAN,
                ),
            ),
        ),
    )
}
