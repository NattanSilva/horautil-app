package br.com.horautil.domain.usecase

import br.com.horautil.domain.model.TeacherDetail
import br.com.horautil.domain.repository.TeacherRepository

class GetTeacherDetailUseCase(
    private val repository: TeacherRepository,
) {
    suspend operator fun invoke(teacherId: String): Result<TeacherDetail> =
        repository.getTeacher(teacherId)
}
