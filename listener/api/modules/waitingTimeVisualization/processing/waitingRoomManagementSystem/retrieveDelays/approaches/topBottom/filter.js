const identifiers = require('../../../identifiers.json')
const identifierTester = require('../common/identifierTester')
const isWaitingRoom = require('../common/isWaitingRoom')

module.exports = function (appointmentType, history) {
  const appointmentTypeIdentifiers = identifiers.appointmentTypes[appointmentType]
  if (!appointmentTypeIdentifiers) {
    throw new Error(`Unknown appointment type: ${appointmentType}`)
  }
  const appointmentTypeTester = identifierTester(appointmentTypeIdentifiers)
  let first
  let last
  let row = false
  let index = history.length
  while (index > 0) {
    const historyNode = history[--index]
    const venueName = historyNode.CheckinVenueName
    if (appointmentTypeTester(venueName)) {
      if (last) {
        if (row) {
          last = historyNode
        } else {
          break
        }
      } else {
        row = true
        last = historyNode
      }
    } else if (last && isWaitingRoom(venueName)) {
      if (row) {
        row = false
      }
      first = historyNode
    } else if (last) {
      break
    }
  }
  return [last, first]
}
