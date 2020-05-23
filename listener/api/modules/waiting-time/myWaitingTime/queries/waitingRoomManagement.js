const mysql = require('mysql');
const _default = {
    retrieveAppointmentById: (appointmentId) =>
        mysql.format(`SELECT
        AppointmentCode
            , UNIX_TIMESTAMP(ScheduledDateTime) AS ScheduledDateTime
            , WEEKDAY(ScheduledDateTime) AS ScheduledDay
            , HOUR(ScheduledDateTime) AS ScheduledHour
            , MINUTE(ScheduledDateTime) AS ScheduledMinutes
        FROM MediVisitAppointmentList
        WHERE
            AppointmentSerNum = ?`, [appointmentId]),
    retrieveAppointmentsHistoryFromPatient: (patientId) => mysql.format(`
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
            AppointmentsList.PatientSerNum = ?
            AND TIMESTAMPDIFF(DAY, NOW(), AppointmentsList.ScheduledDateTime) < 0
        ORDER BY
            PatientSerNum, AppointmentSerNum, ScheduledDateTime, PatientLocationRevCount ASC;
    `, [patientId]),
    retrieveAppointmentsHistoryOfAppointment: (appointmentId) =>
        mysql.format(`
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
            AppointmentsList.AppointmentSerNum = ?
            AND TIMESTAMPDIFF(DAY, NOW(), AppointmentsList.ScheduledDateTime) < 0
        ORDER BY
            PatientSerNum, AppointmentSerNum, ScheduledDateTime, PatientLocationRevCount ASC;
    `, [appointmentId])
}

module.exports = _default
