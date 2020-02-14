module.exports = function (dateAppointments, dateAppointmentsObj) {
  const orderedAppointments = dateAppointments.sort((a, b) => {
    const { MaxPatientLocationRevCount: aMaxRevCount } = dateAppointmentsObj[a]
    const { MaxPatientLocationRevCount: bMaxRevCount } = dateAppointmentsObj[b]
    if (aMaxRevCount > bMaxRevCount) {
      return 1
    } else if (bMaxRevCount > aMaxRevCount) {
      return -1
    }
    return 0
  })
  let lastMaxRevCount
  for (const appointmentId of orderedAppointments) {
    const appointment = dateAppointmentsObj[appointmentId]
    if (lastMaxRevCount !== undefined && lastMaxRevCount > 0) {
      appointment.History.splice(0, lastMaxRevCount)
    }
    lastMaxRevCount = appointment.MaxPatientLocationRevCount
  }
}
