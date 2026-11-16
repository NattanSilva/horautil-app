package br.com.horautil.navigation

import androidx.compose.runtime.Composable
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import androidx.navigation.compose.NavHost
import androidx.navigation.compose.composable
import androidx.navigation.compose.rememberNavController
import br.com.horautil.ui.screens.auth.LoginRoute
import br.com.horautil.ui.screens.auth.RegisterRoute
import br.com.horautil.ui.screens.home.HomeRoute
import br.com.horautil.ui.screens.onboarding.OnboardingRoute

@Composable
fun AppNavHost() {
    val navController = rememberNavController()

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
            HomeRoute()
        }
    }
}
