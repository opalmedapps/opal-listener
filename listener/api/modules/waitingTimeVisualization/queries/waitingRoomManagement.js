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
        AND TIMESTAMPDIFF(DAY, NOW(), AppointmentsList.ScheduledDateTime) < 0
    ORDER BY
        PatientSerNum, AppointmentSerNum, ScheduledDateTime, PatientLocationRevCount ASC;
  `,
  retrieveAppointmentsHistoryByComparison: (appointmentId) => `
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
    LEFT JOIN MediVisitAppointmentList AS CurrentAppointment
        ON CurrentAppointment.AppointmentSerNum = ${appointmentId}
    WHERE
        AppointmentsList.AppointmentCode = CurrentAppointment.AppointmentCode
        AND WEEKDAY(AppointmentsList.ScheduledDateTime) = WEEKDAY(CurrentAppointment.ScheduledDateTime)
        AND HOUR(AppointmentsList.ScheduledDateTime) = HOUR(CurrentAppointment.ScheduledDateTime)
        AND MINUTE(AppointmentsList.ScheduledDateTime) = MINUTE(CurrentAppointment.ScheduledDateTime)
        AND TIMESTAMPDIFF(DAY, NOW(), AppointmentsList.ScheduledDateTime) < 0
    ORDER BY
        PatientSerNum, AppointmentSerNum, ScheduledDateTime, PatientLocationRevCount ASC;
  `
}

module.exports = _default
