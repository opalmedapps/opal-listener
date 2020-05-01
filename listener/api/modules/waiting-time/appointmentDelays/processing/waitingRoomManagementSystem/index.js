const { runWaitingRoomSqlQuery } = require('../../../../../sqlInterface')
const { waitingRoomManagement: waitingRoomQueries } = require('../../queries')
const groupify = require('./groupify')
const usersAppointments = require('./usersAppointments')
const retrieveDelays = require('./retrieveDelays')
const delayGroups = require('./delayGroups')

module.exports = {
  getAppointment: (appointmentId) => {
    return new Promise((resolve, reject) => {
      runWaitingRoomSqlQuery(waitingRoomQueries.retrieveAppointmentById(appointmentId))
      .then((results) => {
        if (results && results.length > 0) {
          const result = results[0]
          resolve({
            appointmentType: result.AppointmentCode,
            scheduledDateTime: result.ScheduledDateTime,
            scheduledDay: result.ScheduledDay,
            scheduledHour: result.ScheduledHour,
            scheduledMinutes: result.ScheduledMinutes
          })
        } else {
          reject(new Error(`Appointment not found: ${appointmentId}`))
        }
      })
      .catch(reject)
    })
  },
  process: (appointmentType, scheduledDay, scheduledHour, scheduledMinutes) => {
    return new Promise((resolve, reject) => {
      runWaitingRoomSqlQuery(waitingRoomQueries.retrieveAppointmentsHistory(appointmentType, scheduledDay, scheduledHour, scheduledMinutes))
        .then((results) => {
          groupify(results)
          .then(usersAppointments)
          .catch(reject)
          .then(retrieveDelays)
          .catch(reject)
          .then(delayGroups)
          .catch(reject)
          .then(resolve)
        })
        .catch(reject)
    })
  }
  
}
