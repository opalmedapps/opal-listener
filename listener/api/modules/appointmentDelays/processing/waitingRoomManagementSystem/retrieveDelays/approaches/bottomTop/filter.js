const identifierTester = require('../../../../../../common/schedules/identifierTester')
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

function retrieveWaitingRoom (appointmentType, fromAreaIndex, history) {
  const isWaitingRoom = identifierTester(appointmentType, 'waitingRooms')
  if (typeof isWaitingRoom !== 'function') {
    throw isWaitingRoom
  }
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
  const appointmentTypeTester = identifierTester(appointmentType, 'examRooms')
  if (typeof appointmentTypeTester !== 'function') {
    throw appointmentTypeTester
  }
  const [area, areaIndex] = retrieveArea(appointmentTypeTester, history)
  if (area) {
    if (area.ArrivalDateTime <= scheduledTime) { // if patient got seen earlier than the appointment's scheduled time, there's no need to search for first checkin
      return [area]
    } else {
      return [area, retrieveWaitingRoom(appointmentType, areaIndex, history)]
    }
  }
  return emptyResponse
}
