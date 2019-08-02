const { runWaitingRoomSqlQuery } = require('../../../../sqlInterface')
const { waitingRoomManagement: waitingRoomQueries } = require('../../queries')
const groupify = require('./groupify')
const usersAppointments = require('./usersAppointments')
const retrieveTimestamps = require('./retrieveTimestamps')
const timestampsGroups = require('./timestampsGroups')


function addStart(data, appointment){
    const dataAmount = data.length
    if(dataAmount == 0){
        var finalResult =[]
        return finalResult
    }
    try {
        if (typeof appointment !== 'undefined' && appointment !== null && typeof data !== 'undefined' &&
            data !== null) {
                var finalResult = []
                var obj = {
                    'PatientSerNum': data[0].PatientSerNum,
                    'AppointmentSerNum': data[0].AppointmentSerNum,
                    'AppointmentCode': data[0].AppointmentCode,
                    'ScheduledDateTime': data[0].ScheduledDateTime,
                    'PatientLocationRevCount': data[0].PatientLocationRevCount,
                    'CheckinVenueName': data[0].CheckinVenueName,
                    'ArrivalDateTime': data[0].ArrivalDateTime
                }
                var date = new Date(appointment.ActualStartDate)
                var timestamp = date.getTime() / 1000
                obj.ActualStartDate = timestamp
                finalResult[0] = obj
            return finalResult
        } else {
            var finalResult = []
            resolve(finalResult)
        }
    }catch(e){
        var finalResult = []
        resolve(finalResult)
    }
}


module.exports = function (appointment) {
  return new Promise((resolve, reject) => {
      runWaitingRoomSqlQuery(waitingRoomQueries.retrieveAppointmentsHistoryOfAppointment(appointment.AppointmentAriaSer))
          .then((results) => addStart(results, appointment))
          .then((results) => {
              groupify(results)
                  .then(usersAppointments)
                  .catch(reject)
                  .then(retrieveTimestamps)
                  .catch(reject)
                  .then(timestampsGroups(appointment.AppointmentSerNum))
                  .catch(reject)
                  .then(resolve)
      })
    .catch(reject)
  })
}
