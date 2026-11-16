package br.com.horautil.navigation

import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.navigationBarsPadding
import androidx.compose.foundation.layout.padding
import androidx.compose.material3.SnackbarHost
import androidx.compose.material3.SnackbarHostState
import androidx.compose.runtime.Composable
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.res.stringResource
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import androidx.navigation.NavType
import androidx.navigation.compose.NavHost
import androidx.navigation.compose.composable
import androidx.navigation.compose.rememberNavController
import androidx.navigation.navArgument
import br.com.horautil.R
import br.com.horautil.ui.components.HomeDestination
import br.com.horautil.ui.screens.agenda.AgendaRoute
import br.com.horautil.ui.screens.auth.LoginRoute
import br.com.horautil.ui.screens.auth.RegisterRoute
import br.com.horautil.ui.screens.home.HomeRoute
import br.com.horautil.ui.screens.onboarding.OnboardingRoute
import br.com.horautil.ui.screens.review.ReviewRoute
import br.com.horautil.ui.screens.teacher.TeacherProfileRoute
import br.com.horautil.ui.screens.wallet.WalletRoute
import br.com.horautil.ui.theme.HoraUtilDimens
import kotlinx.coroutines.launch

@Composable
fun AppNavHost() {
    val navController = rememberNavController()
    val snackbarHostState = remember { SnackbarHostState() }
    val scope = rememberCoroutineScope()
    val comingSoon = stringResource(R.string.home_coming_soon)

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
            HomeDestination.PROFILE ->
                scope.launch { snackbarHostState.showSnackbar(comingSoon) }
        }
    }

    Box(modifier = Modifier.fillMaxSize()) {
        NavHost(
            navController = navController,
            startDestination = AuthRoutes.Login,
            modifier = Modifier.fillMaxSize(),
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

            composable(HomeRoutes.Agenda) {
                AgendaRoute(
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
                        navController.navigate(HomeRoutes.Agenda) {
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

        SnackbarHost(
            hostState = snackbarHostState,
            modifier = Modifier
                .align(Alignment.BottomCenter)
                .navigationBarsPadding()
                .padding(HoraUtilDimens.Space2),
        )
    }
}
