const process = require('./processor')
const logger = require('../../../../logs/logger');
const cacheOf = require('./cache')
const getAppointmentsOf = require('./getAppointments')

function createDefaultErrorLogger (cb) {
  return (err) => {
    logger.log('error', err)
    cb({data: {err: JSON.stringify(err.stack || err)}})
  }
}

function onDataReady (cb) {
  return (results) => cb({data: {results: JSON.stringify(results)}})
}

module.exports = function (requestObject) {
  return new Promise((resolve) => {
    const { patientId } = requestObject.Parameters
    const onError = createDefaultErrorLogger(resolve)
    if (!patientId) {
      return onError(new Error(`Missing parameter on request: "patientId".`))
    }
    cacheOf(patientId)
      .then(getAppointmentsOf(patientId))
        .then(process(patientId))
          .then(onDataReady(resolve))
          .catch(onError)
        .catch(onError)
      .catch(onError)
    .catch(onError)
  })
}
