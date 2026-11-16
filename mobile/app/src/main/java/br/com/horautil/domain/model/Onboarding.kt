package br.com.horautil.domain.model

data class OnboardingOption(
    val id: String,
    val label: String,
)

data class OnboardingOptions(
    val teach: List<OnboardingOption>,
    val learn: List<OnboardingOption>,
    val days: List<OnboardingOption>,
    val periods: List<OnboardingOption>,
    val defaultTeachIds: Set<String>,
    val defaultLearnIds: Set<String>,
    val defaultDayIds: Set<String>,
    val defaultPeriodIds: Set<String>,
)

data class OnboardingSelection(
    val teachIds: Set<String>,
    val learnIds: Set<String>,
    val dayIds: Set<String>,
    val periodIds: Set<String>,
)
