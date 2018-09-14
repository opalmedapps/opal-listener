const { runSqlQuery } = require('../../sqlInterface')
const { opalDb: opalDbQueries } = require('./queries')

module.exports = function (patientId) {
  return function (cached) {
    return new Promise((resolve, reject) => {
      console.log('cached: ', cached)
      const knownAppointments = cached && cached.length > 0 ? cached.map((cachedAppointment) => cachedAppointment.AppointmentSerNum) : null
      console.log('known appointments: ', knownAppointments)
      runSqlQuery(opalDbQueries.getAppointments(patientId, knownAppointments))
        .then((results) => resolve(results && results.length > 0 ? [cached, results] : [cached, null]))
        .catch(reject)
    })
  }
}
