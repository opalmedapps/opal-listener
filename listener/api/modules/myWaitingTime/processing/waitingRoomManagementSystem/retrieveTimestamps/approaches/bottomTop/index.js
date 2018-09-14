const filter = require('./filter')
const diffMinutes = require('../common/diffMinutes')

module.exports = function (appointment) {
  try {
    const scheduledTime = appointment.ScheduledDateTime
    const [last, first] = filter(appointment.AppointmentCode, scheduledTime, appointment.History)
    if (last) { // this means the patient was there for the appointment
      const firstTime = first ? first.ArrivalDateTime : scheduledTime
      const lastTime = last.ArrivalDateTime
      return {
        ScheduledTime: scheduledTime,
        FirstCheckinTime: firstTime,
        ActualStartTime: lastTime
      }
    }
  } catch (e) {
    throw e
  }
  return null
}
