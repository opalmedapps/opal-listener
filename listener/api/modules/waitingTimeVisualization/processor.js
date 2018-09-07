const waitingRoomManagementSystem = require('./processing/waitingRoomManagementSystem')

module.exports = function (source) {
  source = +source || parseInt(source)
  switch (source) {
    case 2:
      return waitingRoomManagementSystem
    default:
      return null
  }
}
