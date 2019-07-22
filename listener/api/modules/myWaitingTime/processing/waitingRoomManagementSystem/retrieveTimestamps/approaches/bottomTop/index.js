const filter = require('./filter')
module.exports = function (appointment) {
  try {
    const scheduledTime = appointment.ScheduledDateTime
    const [last, first] = filter(appointment.AppointmentCode, scheduledTime, appointment.History)
    //first is undefined so set to scheduledTIME //Did I write this? Tessa 99% sure
    if (last) { // this means the patient was there for the appointment
      const firstTime = first ? first.ArrivalDateTime : scheduledTime
      const lastTime = last.ArrivalDateTime
      const actualTime = first.ActualStartDate
      return {
        ScheduledTime: scheduledTime.getTime() / 1000,
        FirstCheckinTime: firstTime.getTime() / 1000,
        ActualStartTime: actualTime.getTime() / 1000
      }
    }
  } catch (e) {
    throw e
  }
  return null

}
