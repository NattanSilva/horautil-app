package br.com.horautil.navigation

import androidx.compose.runtime.Composable
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import androidx.navigation.compose.NavHost
import androidx.navigation.compose.composable
import androidx.navigation.compose.rememberNavController
import br.com.horautil.ui.screens.auth.LoginRoute
import br.com.horautil.ui.screens.auth.RegisterRoute

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
            )
        }

        composable(AuthRoutes.Register) {
            RegisterRoute(
                onBack = { navController.popBackStack() },
                onSignInClick = { navController.popBackStack() },
                onRegistrationSuccess = {
                    navController.previousBackStackEntry
                        ?.savedStateHandle
                        ?.set(AuthRoutes.RegisterSuccessKey, true)
                    navController.popBackStack()
                },
            )
        }
    }
}
