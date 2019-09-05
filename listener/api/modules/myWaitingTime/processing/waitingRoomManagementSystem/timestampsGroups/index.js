module.exports = function (opalAppointmentId) {
  return function (usersAppointments) {
    return new Promise((resolve) => {
      const response = []
      if(usersAppointments.ActualStartDate){
        response.push({
          AppointmentSerNum: opalAppointmentId,
          ScheduledTime: usersAppointments.ScheduledDateTime,
          FirstCheckinTime: usersAppointments.ArrivalDateTime,
          ActualStartTime: usersAppointments.ActualStartDate
        })
      } else {
        const users = Object.keys(usersAppointments)
        for (const user of users) {
          const userDays = usersAppointments[user]
          const days = Object.keys(userDays)
          for (const day of days) {
            const userAppointments = userDays[day]
            const appointments = Object.keys(userAppointments)
            for (const appointmentId of appointments) {
              const appointment = userAppointments[appointmentId]
              const timestamps = appointment.Timestamps
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
      }
      resolve(response)
    })
  }  
}
