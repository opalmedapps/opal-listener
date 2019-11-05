const filter = require('./filter')
module.exports = function (appointment) {
  try {
    const scheduledTime = appointment.ScheduledDateTime
    const [last, first] = filter(appointment.AppointmentCode, scheduledTime, appointment.History)
    console.log("[last, first]: ", [last, first])
    //first is undefined so set to scheduledTime
    if (last) { // this means the patient was there for the appointment
      const firstTime = first ? first.ArrivalDateTime : scheduledTime
      const lastTime = last.ArrivalDateTime

      //If two appointments mistakenly have the same appointment serial number, they will be on different days
      //This eliminates those
      //The premise is that nobody will be waiting for over 24 hours
      var Diff1 = (scheduledTime - firstTime) /1000
      logger.log('info', 'Diff1', Diff1)
      if(Diff1 > 86400){
        throw e
      }
      var Diff2 = (lastTime - firstTime) /1000
      logger.log('info', 'Diff2', Diff2)
      if(Diff2 > 86400){
        throw e
      }

      return {
        ScheduledTime: scheduledTime.getTime() / 1000,
        FirstCheckinTime: firstTime.getTime() / 1000,
        ActualStartTime: lastTime.getTime() / 1000
      }
    }
  } catch (e) {
    console.log("catching error 3")
    throw e
  }
  return null

}
