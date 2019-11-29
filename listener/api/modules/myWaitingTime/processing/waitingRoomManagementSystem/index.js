const { runWaitingRoomSqlQuery } = require('../../../../sqlInterface')
const { waitingRoomManagement: waitingRoomQueries } = require('../../queries')
const groupify = require('./groupify')
const usersAppointments = require('./usersAppointments')
const retrieveTimestamps = require('./retrieveTimestamps')
const timestampsGroups = require('./timestampsGroups')


function simplifyIfPossible(data, appointment){
    const dataAmount = data.length

    if(dataAmount == 0){
        var finalResult =[]
        return finalResult
    }

    try {
        if (typeof appointment !== 'undefined' && appointment !== null && typeof data !== 'undefined' &&
            data !== null) {
                if(appointment.ActualStartDate === '0000-00-00 00:00:00'){
                    return data
                } else {
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
                    var date = appointment.ActualStartDate
                    obj.ActualStartDate = date
                    finalResult = obj
                    return finalResult
                }
        } else {
            var finalResult = []
            return finalResult
        }
    }catch(e){
        var finalResult = []
        return finalResult
    }
}


module.exports = function (appointment) {
  return new Promise((resolve, reject) => {
      runWaitingRoomSqlQuery(waitingRoomQueries.retrieveAppointmentsHistoryOfAppointment(appointment.AppointmentAriaSer))
          .then((results) => simplifyIfPossible(results, appointment))
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
