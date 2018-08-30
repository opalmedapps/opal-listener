const _default = {
  retrieveAppointmentsHistory: (appointmentType, scheduledDay, scheduledHour, scheduledMinutes) => `
    SELECT
        AppointmentsList.PatientSerNum AS PatientSerNum
        , AppointmentsList.AppointmentSerNum AS AppointmentSerNum
        , AppointmentsList.AppointmentCode AS AppointmentCode
        , UNIX_TIMESTAMP(AppointmentsList.ScheduledDateTime) AS ScheduledDateTime
        , PatientLocationHistory.PatientLocationRevCount AS PatientLocationRevCount
        , PatientLocationHistory.CheckinVenueName AS CheckinVenueName
        , UNIX_TIMESTAMP(PatientLocationHistory.ArrivalDateTime) AS ArrivalDateTime
        , UNIX_TIMESTAMP(PatientLocationHistory.DichargeThisLocationDateTime) AS DichargeThisLocationDateTime
    FROM MediVisitAppointmentList AS AppointmentsList
    INNER JOIN PatientLocationMH AS PatientLocationHistory
        ON PatientLocationHistory.AppointmentSerNum = AppointmentsList.AppointmentSerNum
    WHERE
        AppointmentsList.AppointmentCode = '${appointmentType}'
        AND WEEKDAY(AppointmentsList.ScheduledDateTime) = ${scheduledDay}
        AND HOUR(AppointmentsList.ScheduledDateTime) = ${scheduledHour}
        AND MINUTE(AppointmentsList.ScheduledDateTime) = ${scheduledMinutes}
    ORDER BY
        PatientSerNum, AppointmentSerNum, ScheduledDateTime, PatientLocationRevCount ASC;
  `
}

module.exports = _default
