const retrieveProcessor = require('./processor')
const logger = require('../../../logs/logger');
const cacheOf = require('./cache')
const { opalDb : opalDbQueries} = require('./queries')
const { runSqlQuery } = require('../../sqlInterface')

function createDefaultErrorLogger (cb) {
  return (err) => {
    logger.log('error', err)
    cb({data: {err: JSON.stringify(err.stack || err)}})
  }
}

function onDataReady (cb, appointmentType, scheduledDay, scheduledHour, scheduledMinutes) {
  return (sets) => cb({data: {delays: JSON.stringify({sets, appointmentType, scheduledDay, scheduledHour, scheduledMinutes})}})
}

function auxFunction(sets){
    return new Promise((resolve)=>{
        resolve(sets)
    })
}

module.exports = function (requestObject) {
    runSqlQuery(opalDbQueries.createTable())
  return new Promise((resolve) => {
    const { refId, refSource } = requestObject.Parameters
    const onError = createDefaultErrorLogger(resolve)
    if (!refId) {
      return onError(new Error(`Missing parameter on request: "refId".`))
    }
    if (!refSource) {
      return onError(new Error('Missing parameter on request: "refSource".'))
    }
    const processor = retrieveProcessor(refSource)
    if (!processor) {
      return onError(new Error(`Unknown source: ${refSource}.`))
    }
    processor.getAppointment(refId)
      .then(({appointmentType, scheduledDay, scheduledHour, scheduledMinutes}) => {
        const cache = cacheOf(appointmentType, scheduledDay, scheduledHour, scheduledMinutes)
        cache.verify()
          .then((cachedSets) => {
            if(cachedSets) {
              return onDataReady(resolve, appointmentType, scheduledDay, scheduledHour, scheduledMinutes)(cachedSets)
            }
            processor.process(appointmentType, scheduledDay, scheduledHour, scheduledMinutes)
              .then(({set1, set2, set3, set4}) => {
                cache.save(set1, set2, set3, set4)
                  .then(onDataReady(resolve, appointmentType, scheduledDay, scheduledHour, scheduledMinutes))
                  .catch(onError)
              })
              .catch(onError)
          })
          .catch(onError)
      })
      .catch(onError)
  })
}
