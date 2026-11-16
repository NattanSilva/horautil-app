package br.com.horautil.domain.repository

import br.com.horautil.domain.model.TeacherDetail

interface TeacherRepository {
    suspend fun getTeacher(teacherId: String): Result<TeacherDetail>
}
