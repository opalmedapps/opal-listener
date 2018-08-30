const filter = require('./filter')
const diffMinutes = require('../common/diffMinutes')

// deprecated, should not be used since bottomTop approach gives us better results
module.exports = function (appointment) {
  console.log('You are using the topBottom approach. This is a deprecated method and it will removed soon, since the bottomTop approach is more reliable.')
  const [last, first] = filter(appointment.AppointmentCode, appointment.History)
  if (!last) { // patient has never been there for the appointment
    return null
  }
  const firstTime = first ? first.ArrivalDateTime : appointment.ScheduledDateTime
  const lastTime = last.ArrivalDateTime
  const scheduledTime = appointment.ScheduledDateTime
  if (firstTime > scheduledTime) { // patient is late?
    return null
  } else {
    return {
      Value: diffMinutes(scheduledTime, lastTime),
      Entries: [{ ArrivalDateTime: scheduledTime }, last]
    }
  }
}
