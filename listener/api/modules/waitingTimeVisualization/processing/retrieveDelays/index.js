const bottomTopApproach = require('./approaches/bottomTop')
const cleanupHistory = require('./approaches/cleanHistory')

module.exports = function (usersAppointments) {
  return new Promise((resolve) => {
    for (const user in usersAppointments) {
      const userAppointmentsDatesObj = usersAppointments[user]
      const userAppointmentsDates = Object.keys(userAppointmentsDatesObj)
      for (const date of userAppointmentsDates) {
        const dateAppointmentsObj = userAppointmentsDatesObj[date]
        const dateAppointments = Object.keys(dateAppointmentsObj)
        if (dateAppointments.length > 1) {
          // cleanup history, because we got more than one appointment in this day of the same type
          console.log('cleaning up history...')
          cleanupHistory(dateAppointments, dateAppointmentsObj)
          for (const appointmentId of dateAppointments) {
            const appointment = dateAppointmentsObj[appointmentId]
            console.log(appointment)
            appointment.DelayData = bottomTopApproach(appointment)
          }
        } else {
          const appointment = dateAppointmentsObj[dateAppointments[0]]
          appointment.DelayData = bottomTopApproach(appointment)
        }
      }
    }
    resolve(usersAppointments)
  })
}
