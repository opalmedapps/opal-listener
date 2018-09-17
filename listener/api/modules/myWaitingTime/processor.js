const waitingRoomManagementSystem = require('./processing/waitingRoomManagementSystem')
const { runSqlQuery } = require('../../sqlInterface')
const { opalDb: opalDbQueries } = require('./queries')
const { getTimeDifferenceInMinutes } = require('../common/utils')

function getProcessor (source) {
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
      if (newAppointments && newAppointments.length > 0) {
        const promises = []
        for (const newAppointment of newAppointments) {
          const processor = getProcessor(newAppointment.SourceDatabaseSerNum)
          if (processor) {
            const promise = processor(newAppointment).then((response) => response)
            promises.push(promise)
          }
        }
        Promise.all(promises)
          .then((userProcessedAppointments) => {
            const timestamps = [...cache]
            for (const processedAppointments of userProcessedAppointments) {
              for (const processedAppointment of processedAppointments) {
                timestamps.unshift(processedAppointment)
                runSqlQuery(opalDbQueries.registerTimestamps(patientId, processedAppointment.AppointmentSerNum, processedAppointment.FirstCheckinTime, processedAppointment.ScheduledTime, processedAppointment.ActualStartTime))
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
              const firstCheckinTime = new Date(timestamp.FirstCheckinTime * 1000)
              const scheduledTime = new Date(timestamp.ScheduledTime * 1000)
              const actualStartTime = new Date(timestamp.ActualStartTime * 1000)
              const responseWaitingTime = {
                scheduledTime: scheduledTime.getTime(),
                hospitalDelay: 0,
                personalWait: 0
              }
              const diffScheduledFirstCheckin = getTimeDifferenceInMinutes(scheduledTime, firstCheckinTime)
              const isPatientLate = diffScheduledFirstCheckin > 0
              if (isPatientLate) {
                response.onTime.late++
                responseWaitingTime.personalWait = getTimeDifferenceInMinutes(firstCheckinTime, actualStartTime)
              } else {
                responseWaitingTime.hospitalDelay = getTimeDifferenceInMinutes(scheduledTime, actualStartTime)
                responseWaitingTime.personalWait = getTimeDifferenceInMinutes(firstCheckinTime, scheduledTime)
                if (responseWaitingTime.personalWait > 30) {
                  response.onTime.tooEarly++
                } else {
                  response.onTime.onTime++
                }
              }
              response.waitingTimes.push(responseWaitingTime)
            }
            response.waitingTimes = response.waitingTimes.sort((a, b) => a.ScheduledTime > b.ScheduledTime)
            resolve(response)
          })
          .catch(reject)
      } else {
        resolve(cache)
      }
    })
  }
}
