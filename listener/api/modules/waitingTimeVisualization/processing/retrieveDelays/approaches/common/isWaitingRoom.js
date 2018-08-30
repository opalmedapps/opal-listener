const identifierTester = require('./identifierTester')(require('../../../identifiers.json').waitingRooms)

module.exports = function (venueName) {
  return identifierTester(venueName)
}
