const sortAscending = require('./ascending')
const sortMostFrequent = require('./mostFrequent')

module.exports = function (usersAppointments) {
  return new Promise((resolve) => {
    const response = {}
    const users = Object.keys(usersAppointments)
    for (const user of users) {
      const userDays = usersAppointments[user]
      const days = Object.keys(userDays)
      for (const day of days) {
        const userAppointments = userDays[day]
        const appointments = Object.keys(userAppointments)
        for (const appointmentId of appointments) {
          const appointment = userAppointments[appointmentId]
          const delayData = appointment.DelayData
          if (delayData) {
            const value = delayData.Value
            response[value] = (response[value] || 0) + 1
          }
        }
      }
    }
    resolve({ values: response, ascendingDelay: sortAscending(response), delayFrequency: sortMostFrequent(response) })
  })
}
