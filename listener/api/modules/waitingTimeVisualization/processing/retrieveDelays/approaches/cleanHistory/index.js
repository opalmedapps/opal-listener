module.exports = function (dateAppointments, dateAppointmentsObj) {
  console.log(dateAppointments)
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
  console.log(orderedAppointments)
  for (const appointmentId of orderedAppointments) {
    const appointment = dateAppointmentsObj[appointmentId]
    if (lastMaxRevCount !== undefined && lastMaxRevCount > 0) {
      console.log(appointment.History.splice(0, lastMaxRevCount))
    }
    lastMaxRevCount = appointment.MaxPatientLocationRevCount
  }
  console.log('CLEANED:')
  console.log(dateAppointmentsObj)
}
