module.exports = function (usersAppointments) {
  return new Promise((resolve) => {
    const response = {
      set1: 0,
      set2: 0,
      set3: 0,
      set4: 0
    }
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
            if (value >= 0 && value <= 15) {
              response.set1 = response.set1 + 1
            } else if (value > 15 && value <= 30) {
              response.set2 = response.set2 + 1
            } else if (value > 30 && value <= 45) {
              response.set3 = response.set3 + 1
            } else if (value > 45) {
              response.set4 = response.set4 + 1
            }
          }
        }
      }
    }
    resolve(response)
  })
}
