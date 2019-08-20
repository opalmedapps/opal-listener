const bottomTopApproach = require('./approaches/bottomTop')
const cleanupHistory = require('./approaches/cleanHistory')

module.exports = function (usersAppointments) {
  if(usersAppointments.ActualStartDate){
    console.log(usersAppointments.ActualStartDate)
    return usersAppointments
  }
  if(usersAppointments == 0){
    usersAppointments = []
    return usersAppointments
  }
  return new Promise((resolve, reject) => {
    try {

      for (const user in usersAppointments) {
        const userAppointmentsDatesObj = usersAppointments[user]
        const userAppointmentsDates = Object.keys(userAppointmentsDatesObj)
        for (const date of userAppointmentsDates) {
          const dateAppointmentsObj = userAppointmentsDatesObj[date]
          const dateAppointments = Object.keys(dateAppointmentsObj)
          if (dateAppointments.length > 1) {
            cleanupHistory(dateAppointments, dateAppointmentsObj)
            for (const appointmentId of dateAppointments) {
              const appointment = dateAppointmentsObj[appointmentId]
              appointment.Timestamps = bottomTopApproach(appointment)
              if (typeof appointment.Timestamps == null)
              {
                throw e
              }
            }
          } else {
            const appointment = dateAppointmentsObj[dateAppointments[0]]
            appointment.Timestamps = bottomTopApproach(appointment)
            if(appointment.Timestamps === null){
              user = 0
            }
            }
        }
      }
      resolve(usersAppointments)
    } catch (e) {
      var finalResult = []
      resolve(finalResult)
    }
  })
}
