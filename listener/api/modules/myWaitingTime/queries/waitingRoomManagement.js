const _default = {
    retrieveAppointmentById: (appointmentId) => `
    SELECT
        AppointmentCode
        , UNIX_TIMESTAMP(ScheduledDateTime) AS ScheduledDateTime
        , WEEKDAY(ScheduledDateTime) AS ScheduledDay
        , HOUR(ScheduledDateTime) AS ScheduledHour
        , MINUTE(ScheduledDateTime) AS ScheduledMinutes
    FROM MediVisitAppointmentList
    WHERE
        AppointmentSerNum = ${appointmentId};
  `,
  retrieveAppointmentsHistoryFromPatient: (patientId) => `
    SELECT
        AppointmentsList.PatientSerNum AS PatientSerNum
        , AppointmentsList.AppointmentSerNum AS AppointmentSerNum
        , AppointmentsList.AppointmentCode AS AppointmentCode
        , UNIX_TIMESTAMP(AppointmentsList.ScheduledDateTime) AS ScheduledDateTime
        , PatientLocationHistory.PatientLocationRevCount AS PatientLocationRevCount
        , PatientLocationHistory.CheckinVenueName AS CheckinVenueName
        , UNIX_TIMESTAMP(PatientLocationHistory.ArrivalDateTime) AS ArrivalDateTime
    FROM MediVisitAppointmentList AS AppointmentsList
    INNER JOIN PatientLocationMH AS PatientLocationHistory
        ON PatientLocationHistory.AppointmentSerNum = AppointmentsList.AppointmentSerNum
    WHERE
        AppointmentsList.PatientSerNum = ${patientId}
        AND TIMESTAMPDIFF(DAY, NOW(), AppointmentsList.ScheduledDateTime) < 0
    ORDER BY
        PatientSerNum, AppointmentSerNum, ScheduledDateTime, PatientLocationRevCount ASC;
  `,
  retrieveAppointmentsHistoryOfAppointment: (appointmentId) => `
    SELECT
        AppointmentsList.PatientSerNum AS PatientSerNum
        , AppointmentsList.AppointmentSerNum AS AppointmentSerNum
        , AppointmentsList.AppointmentCode AS AppointmentCode
        , UNIX_TIMESTAMP(AppointmentsList.ScheduledDateTime) AS ScheduledDateTime
        , PatientLocationHistory.PatientLocationRevCount AS PatientLocationRevCount
        , PatientLocationHistory.CheckinVenueName AS CheckinVenueName
        , UNIX_TIMESTAMP(PatientLocationHistory.ArrivalDateTime) AS ArrivalDateTime
    FROM MediVisitAppointmentList AS AppointmentsList
    INNER JOIN PatientLocationMH AS PatientLocationHistory
        ON PatientLocationHistory.AppointmentSerNum = AppointmentsList.AppointmentSerNum
    WHERE
        AppointmentsList.AppointmentSerNum = ${appointmentId}
        AND TIMESTAMPDIFF(DAY, NOW(), AppointmentsList.ScheduledDateTime) < 0
    ORDER BY
        PatientSerNum, AppointmentSerNum, ScheduledDateTime, PatientLocationRevCount ASC;
  `
}

module.exports = _default
