const identifiers = require('../../../identifiers.json')
const identifierTester = require('../common/identifierTester')
const isWaitingRoom = require('../common/isWaitingRoom')
const emptyResponse = []

function retrieveArea (appointmentTypeTester, history) {
  for (let i = 0, j = history.length; i < j; ++i) {
    const historyNode = history[i]
    if (appointmentTypeTester(historyNode.CheckinVenueName)) {
      return [historyNode, i]
    }
  }
  return emptyResponse
}

function retrieveWaitingRoom (fromAreaIndex, history) {
  let waitingRoomNode
  while (--fromAreaIndex >= 0) {
    const historyNode = history[fromAreaIndex]
    if (!isWaitingRoom(historyNode.CheckinVenueName)) {
      break
    }
    waitingRoomNode = historyNode
  }
  return waitingRoomNode
}

module.exports = function (appointmentType, scheduledTime, history) {
  const appointmentTypeIdentifiers = identifiers.appointmentTypes[appointmentType]
  if (!appointmentTypeIdentifiers) {
    throw new Error(`Unknown appointment type: ${appointmentType}`)
  }
  const appointmentTypeTester = identifierTester(appointmentTypeIdentifiers)
  const [area, areaIndex] = retrieveArea(appointmentTypeTester, history)
  if (area) {
    if (area.ArrivalDateTime <= scheduledTime) { // if patient got seen earlier than the appointment's scheduled time, there's no need to search for first checkin
      return [area]
    } else {
      return [area, retrieveWaitingRoom(areaIndex, history)]
    }
  }
  return emptyResponse
}
