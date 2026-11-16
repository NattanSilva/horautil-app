package br.com.horautil.domain.repository

import br.com.horautil.domain.model.UserProfile

interface UserProfileRepository {
    suspend fun getProfile(): Result<UserProfile>
    suspend fun updateSkills(teaches: List<String>, wants: List<String>): Result<Unit>
}
