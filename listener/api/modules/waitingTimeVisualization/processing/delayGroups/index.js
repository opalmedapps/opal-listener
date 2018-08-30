module.exports = function (usersAppointments) {
  return new Promise((resolve) => {
    const response = {
      Set1: 0,
      Set2: 0,
      Set3: 0,
      Set4: 0
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
              response.Set1 = response.Set1 + 1
            } else if (value > 15 && value <= 30) {
              response.Set2 = response.Set2 + 1
            } else if (value > 30 && value <= 45) {
              response.Set3 = response.Set3 + 1
            } else if (value > 45) {
              response.Set4 = response.Set4 + 1
            }
          }
        }
      }
    }
    resolve(response)
  })
}
