const { runSqlQuery } = require('../../sqlInterface')
const { opalDb: opalDbQueries } = require('./queries')

module.exports = function (patientId) {
  return new Promise((resolve, reject) => {
    runSqlQuery(opalDbQueries.getTimestamps(patientId))
      .then((results) => resolve(results && results.length > 0 ? results : []))
      .catch(reject)
  })
}
