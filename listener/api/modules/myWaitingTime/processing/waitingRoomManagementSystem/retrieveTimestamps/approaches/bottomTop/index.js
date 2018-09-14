const filter = require('./filter')

module.exports = function (appointment) {
  try {
    const scheduledTime = appointment.ScheduledDateTime
    const [last, first] = filter(appointment.AppointmentCode, scheduledTime, appointment.History)
    if (last) { // this means the patient was there for the appointment
      const firstTime = first ? first.ArrivalDateTime : scheduledTime
      const lastTime = last.ArrivalDateTime
      return {
        ScheduledTime: scheduledTime.getTime() / 1000,
        FirstCheckinTime: firstTime.getTime() / 1000,
        ActualStartTime: lastTime.getTime() / 1000
      }
    }
  } catch (e) {
    throw e
  }
  return null
}
