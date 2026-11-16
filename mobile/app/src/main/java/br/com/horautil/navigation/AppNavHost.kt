package br.com.horautil.navigation

import androidx.compose.runtime.Composable
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import androidx.navigation.NavType
import androidx.navigation.compose.NavHost
import androidx.navigation.compose.composable
import androidx.navigation.compose.rememberNavController
import androidx.navigation.navArgument
import br.com.horautil.ui.components.HomeDestination
import br.com.horautil.ui.screens.agenda.AgendaRoute
import br.com.horautil.ui.screens.auth.LoginRoute
import br.com.horautil.ui.screens.auth.RegisterRoute
import br.com.horautil.ui.screens.home.HomeRoute
import br.com.horautil.ui.screens.onboarding.OnboardingRoute
import br.com.horautil.ui.screens.profile.ProfileRoute
import br.com.horautil.ui.screens.review.ReviewRoute
import br.com.horautil.ui.screens.teacher.TeacherProfileRoute
import br.com.horautil.ui.screens.wallet.WalletRoute
import br.com.horautil.viewmodel.AgendaFilter

@Composable
fun AppNavHost() {
    val navController = rememberNavController()

    fun selectTab(route: String) {
        navController.navigate(route) {
            popUpTo(HomeRoutes.Home) {
                saveState = true
            }
            launchSingleTop = true
            restoreState = true
        }
    }

    val onDestinationSelected: (HomeDestination) -> Unit = { destination ->
        when (destination) {
            HomeDestination.EXPLORE -> selectTab(HomeRoutes.Home)
            HomeDestination.SCHEDULE -> selectTab(HomeRoutes.Agenda)
            HomeDestination.WALLET -> selectTab(HomeRoutes.Wallet)
            HomeDestination.PROFILE -> selectTab(HomeRoutes.Profile)
        }
    }

    NavHost(
        navController = navController,
        startDestination = AuthRoutes.Login,
    ) {
        composable(AuthRoutes.Login) { entry ->
            val registerSuccess = entry.savedStateHandle
                .getStateFlow(AuthRoutes.RegisterSuccessKey, false)
                .collectAsStateWithLifecycle()
                .value

            LoginRoute(
                registerSuccess = registerSuccess,
                onRegisterSuccessShown = {
                    entry.savedStateHandle[AuthRoutes.RegisterSuccessKey] = false
                },
                onRegisterClick = { navController.navigate(AuthRoutes.Register) },
                onLoginSuccess = {
                    navController.navigate(HomeRoutes.Home) {
                        popUpTo(AuthRoutes.Login) { inclusive = true }
                    }
                },
            )
        }

        composable(AuthRoutes.Register) {
            RegisterRoute(
                onBack = { navController.popBackStack() },
                onSignInClick = { navController.popBackStack() },
                onRegistrationSuccess = {
                    navController.navigate(OnboardingRoutes.Onboarding) {
                        popUpTo(AuthRoutes.Login) { inclusive = true }
                    }
                },
            )
        }

        composable(OnboardingRoutes.Onboarding) {
            OnboardingRoute(
                onOnboardingComplete = {
                    navController.navigate(HomeRoutes.Home) {
                        popUpTo(OnboardingRoutes.Onboarding) { inclusive = true }
                    }
                },
            )
        }

        composable(HomeRoutes.Home) {
            HomeRoute(
                onMatchClick = { teacherId ->
                    navController.navigate(HomeRoutes.teacher(teacherId))
                },
                onDestinationSelected = onDestinationSelected,
                onFabClick = { selectTab(HomeRoutes.Home) },
            )
        }

        composable(
            route = HomeRoutes.AgendaPattern,
            arguments = listOf(
                navArgument(HomeRoutes.AgendaFilterArg) {
                    type = NavType.StringType
                    defaultValue = "accepted"
                },
            ),
        ) { entry ->
            val initialFilter = entry.arguments
                ?.getString(HomeRoutes.AgendaFilterArg)
                ?.uppercase()
                ?.let { value -> runCatching { AgendaFilter.valueOf(value) }.getOrNull() }
                ?: AgendaFilter.ACCEPTED

            AgendaRoute(
                initialFilter = initialFilter,
                onDestinationSelected = onDestinationSelected,
                onFabClick = { selectTab(HomeRoutes.Home) },
                onReviewClick = { bookingId ->
                    navController.navigate(HomeRoutes.review(bookingId))
                },
            )
        }

        composable(HomeRoutes.Wallet) {
            WalletRoute(
                onDestinationSelected = onDestinationSelected,
                onFabClick = { selectTab(HomeRoutes.Home) },
            )
        }

        composable(HomeRoutes.Profile) {
            ProfileRoute(
                onDestinationSelected = onDestinationSelected,
                onFabClick = { selectTab(HomeRoutes.Home) },
                onWalletClick = { selectTab(HomeRoutes.Wallet) },
            )
        }

        composable(
            route = HomeRoutes.Teacher,
            arguments = listOf(
                navArgument(HomeRoutes.TeacherArg) { type = NavType.StringType },
            ),
        ) { entry ->
            TeacherProfileRoute(
                teacherId = entry.arguments?.getString(HomeRoutes.TeacherArg).orEmpty(),
                onBack = { navController.popBackStack() },
                onBooked = {
                    navController.navigate(HomeRoutes.agenda("pending")) {
                        popUpTo(HomeRoutes.Home)
                    }
                },
            )
        }

        composable(
            route = HomeRoutes.Review,
            arguments = listOf(
                navArgument(HomeRoutes.BookingArg) { type = NavType.StringType },
            ),
        ) { entry ->
            ReviewRoute(
                bookingId = entry.arguments?.getString(HomeRoutes.BookingArg).orEmpty(),
                onReviewSubmitted = { navController.popBackStack() },
            )
        }
    }
}
