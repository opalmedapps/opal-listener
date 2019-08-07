module.exports = function (opalAppointmentId) {
  return function (usersAppointments) {
    return new Promise((resolve) => {
      const response = []
      const users = Object.keys(usersAppointments)
      console.log("users: ", users)
      for (const user of users) {
        console.log("user: ", user)
        const userDays = usersAppointments[user]
        console.log("userDays: ", userDays)
        const days = Object.keys(userDays)
        console.log("days: ", days)
        for (const day of days) {
          const userAppointments = userDays[day]
          const appointments = Object.keys(userAppointments)
          for (const appointmentId of appointments) {
            const appointment = userAppointments[appointmentId]
            console.log("appointment: ", appointment)
            const timestamps = appointment.Timestamps
            console.log("timestamps: ", timestamps)
              if (timestamps) {
                response.push({
                  AppointmentSerNum: opalAppointmentId,
                  ScheduledTime: timestamps.ScheduledTime,
                  FirstCheckinTime: timestamps.FirstCheckinTime,
                  ActualStartTime: timestamps.ActualStartTime
                })
              }
          }
        }
      }
      resolve(response)
    })
  }  
}
