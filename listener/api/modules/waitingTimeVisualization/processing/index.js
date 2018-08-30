const historyQueries = require('../queries/history')
const groupify = require('./groupify')
const usersAppointments = require('./usersAppointments')
const retrieveDelays = require('./retrieveDelays')
const delayGroups = require('./delayGroups')

module.exports = (opalDb, waitingRoomManagement) => (appointmentType, scheduledDay, scheduledHour, scheduledMinutes) => {
  return new Promise((resolve, reject) => {
    waitingRoomManagement.query(historyQueries.retrieveAppointmentsHistory(appointmentType, scheduledDay, scheduledHour, scheduledMinutes), (err, results) => {
      if (err) return reject(err)
      groupify(results)
        .then(usersAppointments)
        .then(retrieveDelays)
        .then(delayGroups)
        .then(resolve)
    })
  })
}
