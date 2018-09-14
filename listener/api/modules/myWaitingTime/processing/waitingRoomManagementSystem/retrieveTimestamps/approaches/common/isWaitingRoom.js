const identifierTester = require('./identifierTester')(require('../../../../common/identifiers.json').waitingRooms)

module.exports = function (venueName) {
  return identifierTester(venueName)
}
