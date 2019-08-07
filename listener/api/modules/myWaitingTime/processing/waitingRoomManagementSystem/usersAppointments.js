function formatNumber (i) {
  return i < 10 ? `0${i}` : i
}

function getDate (d) {
  return new Date(d * 1000)
}

function formatDate (d) {
  return `${formatNumber(d.getMonth() + 1)}/${formatNumber(d.getDate())}/${formatNumber(d.getFullYear())}`
}

function formatAppointment (users, group, index, max, onDone) {
  if (index === max) {
    return onDone()
  }
  const {
    PatientSerNum,
    AppointmentSerNum,
    AppointmentCode,
    ScheduledDateTime,
    PatientLocationRevCount,
    CheckinVenueName,
    ArrivalDateTime,
    ActualStartDate
   // DichargeThisLocationDateTime
  } = group[index]
  const user = users[PatientSerNum] || (users[PatientSerNum] = {})
  const scheduledDate = getDate(ScheduledDateTime)
  const appointmentDate = formatDate(scheduledDate)
  const appointments = user[appointmentDate] || (user[appointmentDate] = {})
  console.log("appointments: ", appointments)
  const appointmentObj = appointments[AppointmentSerNum] || (appointments[AppointmentSerNum] = { AppointmentCode, MaxPatientLocationRevCount: PatientLocationRevCount, ScheduledDateTime: scheduledDate, History: [] })
  if (PatientLocationRevCount > appointmentObj.MaxPatientLocationRevCount) {
    appointmentObj.MaxPatientLocationRevCount = PatientLocationRevCount
  }
  appointmentObj.History.unshift({ PatientLocationRevCount, ArrivalDateTime: getDate(ArrivalDateTime), ActualStartDate: getDate(ActualStartDate), CheckinVenueName })
  console.log("appointmentObj.History: ", appointmentObj.History)
  formatAppointment(users, group, index + 1, max, onDone)
}

module.exports = function (groups) {
  return new Promise((resolve) => {
    const users = {}
    const max = groups.length
    var index = 0
    if (max == 0){
      resolve(users)
    }
    let count = 0

    const check = () => {
      if (++count === max) {
        resolve(users)
      }
    }
    groups.forEach((group) => {
      formatAppointment(users, group, 0, group.length, check)
      //was group.length instead of groups.length
    })
  })
}
