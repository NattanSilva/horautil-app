package br.com.horautil.domain.usecase

import br.com.horautil.domain.model.UserProfile
import br.com.horautil.domain.repository.UserProfileRepository

class GetUserProfileUseCase(
    private val repository: UserProfileRepository,
) {
    suspend operator fun invoke(): Result<UserProfile> = repository.getProfile()
}
