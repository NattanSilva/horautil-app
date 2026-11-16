package br.com.horautil.domain.repository

import br.com.horautil.domain.model.HomeFeed

interface HomeRepository {
    suspend fun getHomeFeed(): Result<HomeFeed>
}
