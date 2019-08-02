const { runSqlQuery } = require('../../sqlInterface')
const { opalDb: opalDbQueries } = require('./queries')
const logger = require('./../../../logs/logger.js')

module.exports = function (patientId) {
  return new Promise((resolve, reject) => {
    runSqlQuery(opalDbQueries.createTable())
    .then(function(){return runSqlQuery(opalDbQueries.getTimestamps(),[patientId])})
      .then((results) => resolve(results && results.length > 0 ? results : []))
      .catch(reject)
  })
}
