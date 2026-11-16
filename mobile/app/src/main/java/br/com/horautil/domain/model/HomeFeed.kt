package br.com.horautil.domain.model

enum class HomeCategoryIcon {
    MUSIC,
    TECH,
    LANGUAGES,
    SPORTS,
}

enum class HomePalette {
    RED,
    AMBER,
    GREEN,
    CYAN,
    PINK,
    BLUE,
}

data class HomeCategory(
    val id: String,
    val label: String,
    val icon: HomeCategoryIcon,
    val palette: HomePalette,
)

data class HomeMatch(
    val id: String,
    val name: String,
    val initials: String,
    val teaches: String,
    val wants: String,
    val matchPercent: Int,
    val palette: HomePalette,
)

data class HomeFeed(
    val userName: String,
    val userInitials: String,
    val availableBalance: String,
    val categories: List<HomeCategory>,
    val matches: List<HomeMatch>,
)
