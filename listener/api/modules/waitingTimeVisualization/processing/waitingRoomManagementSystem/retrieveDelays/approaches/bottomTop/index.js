const filter = require('./filter')
const diffMinutes = require('../common/diffMinutes')

module.exports = function (appointment) {
  try {
    const scheduledTime = appointment.ScheduledDateTime
    const [last, first] = filter(appointment.AppointmentCode, scheduledTime, appointment.History)
    if (last) { // this means the patient was there for the appointment
      const firstTime = first ? first.ArrivalDateTime : scheduledTime
      const lastTime = last.ArrivalDateTime
      if (scheduledTime >= firstTime) { // check if patient was on time for his appointment, otherwise we don't check for delays
        return {
          Value: diffMinutes(scheduledTime, lastTime),
          Entries: [{ ArrivalDateTime: scheduledTime }, last]
        }
      }
    }
  } catch (e) {
    throw e
  }
  return null
}
