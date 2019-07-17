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
        AND HOUR(AppointmentsList.ScheduledDateTime) BETWEEN (${scheduledHour}-1) AND (${scheduledHour} +1)
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
        ON PatientLocationHistory.AppointmentSerNum = AppointmentsList.AppointmentSerNum,
    (
        SELECT AppointmentCode, ScheduledDateTime FROM MediVisitAppointmentList WHERE AppointmentSerNum = ${appointmentId}
    ) AS CurrentAppointment
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
