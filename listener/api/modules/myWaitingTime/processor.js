const waitingRoomManagementSystem = require('./processing/waitingRoomManagementSystem')
const { runSqlQuery } = require('../../sqlInterface')
const { opalDb: opalDbQueries } = require('./queries')
const diffMinutes = require('./processing/common/diffMinutes')

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
            const timestamps = [...cache]
            console.log('promises ready!')
            console.log(userProcessedAppointments)
            for (const processedAppointments of userProcessedAppointments) {
              for (const processedAppointment of processedAppointments) {
                console.log('saving...')
                console.log(processedAppointment)
                timestamps.unshift(processedAppointment)
                runSqlQuery(opalDbQueries.registerTimestamps(patientId, processedAppointment.AppointmentSerNum, processedAppointment.FirstCheckinTime, processedAppointment.ScheduledTime, processedAppointment.ActualStartTime))
                  .then((result) => {
                    console.log('successfully cached appointment: ', result)
                  })
                  .catch((err) => console.err('cannot cache appointment: ', err))
              }
            }
            const response = {
              waitingTimes: [],
              onTime: {
                onTime: 0,
                tooEarly: 0,
                late: 0
              }
            }
            for (const timestamp of timestamps) {
              console.log(timestamp)
              const firstCheckinTime = new Date(timestamp.FirstCheckinTime * 1000)
              const scheduledTime = new Date(timestamp.ScheduledTime * 1000)
              const actualStartTime = new Date(timestamp.ActualStartTime * 1000)
              const responseWaitingTime = {
                scheduledTime: scheduledTime.getTime(),
                hospitalDelay: 0,
                personalWait: 0
              }
              const diffScheduledFirstCheckin = diffMinutes(scheduledTime, firstCheckinTime)
              console.log('first checkin: ', firstCheckinTime.getTime())
              console.log('scheduled time: ', scheduledTime.getTime())
              console.log('actualStartTime: ', actualStartTime.getTime())
              console.log('diffScheduledFirstCheckin: ', diffScheduledFirstCheckin)
              const isPatientLate = diffScheduledFirstCheckin > 0
              if (isPatientLate) {
                response.onTime.late++
                responseWaitingTime.personalWait = diffMinutes(firstCheckinTime, actualStartTime)
              } else {
                responseWaitingTime.hospitalDelay = diffMinutes(scheduledTime, actualStartTime)
                responseWaitingTime.personalWait = diffMinutes(firstCheckinTime, scheduledTime)
                if (responseWaitingTime.personalWait > 30) {
                  response.onTime.tooEarly++
                } else {
                  response.onTime.onTime++
                }
              }
              response.waitingTimes.push(responseWaitingTime)
            }
            response.waitingTimes = response.waitingTimes.sort((a, b) => a.ScheduledTime > b.ScheduledTime)
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
