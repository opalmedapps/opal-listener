const bottomTopApproach = require('./approaches/bottomTop')
const cleanupHistory = require('./approaches/cleanHistory')

module.exports = function (usersAppointments) {
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
            }
          } else {
            const appointment = dateAppointmentsObj[dateAppointments[0]]
            appointment.Timestamps = bottomTopApproach(appointment)
          }
        }
      }
      resolve(usersAppointments)
    } catch (e) {
      reject(e)
    }
  })
}
