package br.com.horautil.domain.usecase

import br.com.horautil.domain.model.HomeFeed
import br.com.horautil.domain.repository.HomeRepository

class GetHomeFeedUseCase(
    private val repository: HomeRepository,
) {
    suspend operator fun invoke(): Result<HomeFeed> = repository.getHomeFeed()
}
