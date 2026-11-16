package br.com.horautil.navigation

object HomeRoutes {
    const val Home = "home/explore"
    const val Agenda = "home/agenda"
    const val Wallet = "home/wallet"
    const val Profile = "home/profile"

    const val AgendaFilterArg = "filter"
    const val AgendaPattern = "$Agenda?$AgendaFilterArg={$AgendaFilterArg}"

    const val TeacherArg = "teacherId"
    const val Teacher = "teacher/{$TeacherArg}"

    const val BookingArg = "bookingId"
    const val Review = "review/{$BookingArg}"

    fun agenda(filter: String): String = "$Agenda?$AgendaFilterArg=$filter"
    fun teacher(teacherId: String): String = "teacher/$teacherId"
    fun review(bookingId: String): String = "review/$bookingId"
}
