const waitingRoomManagementSystem = require('./processing/waitingRoomManagementSystem')
const { runSqlQuery } = require('../../sqlInterface')
const { opalDb: opalDbQueries } = require('./queries')

function getProcessor (source) {
  console.log('SOURCE: ' + source)
  source = +source || parseInt(source)
  switch (source) {
    case 2:
      return waitingRoomManagementSystem
    default:
      return null
  }
}

module.exports = function (patientId) {
  return function ([cache, newAppointments]) {
    return new Promise((resolve, reject) => {
      console.log('new appointments: ', newAppointments ? newAppointments.length : 0)
      if (newAppointments && newAppointments.length > 0) {
        const promises = []
        for (const newAppointment of newAppointments) {
          const processor = getProcessor(newAppointment.SourceDatabaseSerNum)
          if (processor) {
            console.log('GOT A PROCESSOR!')
            const promise = processor(newAppointment).then((response) => response)
            promises.push(promise)
          }
        }
        console.log(`waiting for ${promises.length} promises...`)
        Promise.all(promises)
          .then((userProcessedAppointments) => {
            const response = [...cache]
            console.log('promises ready!')
            console.log(userProcessedAppointments)
            for (const processedAppointments of userProcessedAppointments) {
              for (const processedAppointment of processedAppointments) {
                console.log('saving...')
                console.log(processedAppointment)
                response.unshift(processedAppointment)
                runSqlQuery(opalDbQueries.registerTimestamps(patientId, processedAppointment.AppointmentSerNum, processedAppointment.FirstCheckinTime, processedAppointment.ScheduledTime, processedAppointment.ActualStartTime))
                  .then((result) => {
                    console.log('successfully cached appointment: ', result)
                  })
                  .catch((err) => console.err('cannot cache appointment: ', err))
              }
            }
            console.log('resolving...')
            resolve(response)
          })
          .catch(reject)
      } else {
        resolve(cache)
      }
    })
  }
}
