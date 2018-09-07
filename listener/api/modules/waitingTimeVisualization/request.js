const retrieveProcessor = require('./processor')
const logger = require('../../../logs/logger');
const cacheOf = require('./cache')

function createDefaultErrorLogger (cb) {
  return (err) => {
    for(let i = 0; i < 10; ++i) console.log('')
    console.log('===== END OF WAITING TIME VISUALIZATION BECAUSE OF ERROR =====')
    logger.log('error', err)
    cb({data: {err: JSON.stringify(err.stack || err)}})
  }
}

function onDataReady (cb, appointmentType, scheduledDay, scheduledHour, scheduledMinutes) {
  return (sets) => {
    for(let i = 0; i < 10; ++i) console.log('')
    console.log('===== END OF WAITING TIME VISUALIZATION =====')
    cb({data: {delays: JSON.stringify({sets, appointmentType, scheduledDay, scheduledHour, scheduledMinutes})}})
  }
}

module.exports = function (requestObject) {
  console.log('===== BEGINNING OF WAITING TIME VISUALIZATION =====')
  for(let i = 0; i < 10; ++i) console.log('')
  return new Promise((resolve) => {
    const { refId, refSource } = requestObject.Parameters
    console.log('refId: ', refId)
    console.log('refSource: ', refSource)
    const onError = createDefaultErrorLogger(resolve)
    if (!refId) {
      return onError(resolve)(new Error(`Missing parameter on request: "refId".`))
    }
    if (!refSource) {
      return onError(resolve)(new Error('Missing parameter on request: "refSource".'))
    }
    const processor = retrieveProcessor(refSource)
    if (!processor) {
      return onError(resolve)(new Error(`Unknown source: ${source}.`))
    }
    console.log('Processor found!')
    processor.getAppointment(refId)
      .then(({appointmentType, scheduledDay, scheduledHour, scheduledMinutes}) => {
        console.log('appointmentData: ', appointmentType, scheduledDay, scheduledHour, scheduledMinutes)
        const cache = cacheOf(appointmentType, scheduledDay, scheduledHour, scheduledMinutes)
        cache.verify()
          .then((cachedSets) => {
            console.log('cachedSets: ', cachedSets)
            if(cachedSets) {
              return onDataReady(resolve, appointmentType, scheduledDay, scheduledHour, scheduledMinutes)(cachedSets)
            }
            processor.process(appointmentType, scheduledDay, scheduledHour, scheduledMinutes)
              .then(({set1, set2, set3, set4}) => {
                console.log('processed sets: ', set1, set2, set3, set4)
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
