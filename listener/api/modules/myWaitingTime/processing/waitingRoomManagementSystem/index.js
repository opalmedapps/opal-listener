const { runWaitingRoomSqlQuery } = require('../../../../sqlInterface')
const { waitingRoomManagement: waitingRoomQueries } = require('../../queries')
const groupify = require('./groupify')
const usersAppointments = require('./usersAppointments')
const retrieveTimestamps = require('./retrieveTimestamps')
const timestampsGroups = require('./timestampsGroups')

module.exports = function (appointment) {
  return new Promise((resolve, reject) => {
    console.log('querying for ' + appointment.AppointmentAriaSer + '...')
    runWaitingRoomSqlQuery(waitingRoomQueries.retrieveAppointmentsHistoryOfAppointment(appointment.AppointmentAriaSer))
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
