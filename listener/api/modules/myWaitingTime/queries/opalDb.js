const mysql = require('mysql');
const _default = {
  createTable: () => `
    CREATE TABLE IF NOT EXISTS UsersAppointmentsTimestamps (
      PatientSerNum int(11) NOT NULL
      , AppointmentSerNum int(11) NOT NULL
      , FirstCheckinTime datetime NOT NULL COMMENT 'First patients check-in in the hospital.'
      , ScheduledTime datetime NOT NULL COMMENT 'Appointments scheduled time.'
      , ActualStartTime datetime NOT NULL COMMENT 'The actual time the appointment really started.'
      , LastUpdate timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      , PRIMARY KEY (PatientSerNum, AppointmentSerNum)
      , FOREIGN KEY (PatientSerNum) REFERENCES Patient(PatientSerNum)
      , FOREIGN KEY (AppointmentSerNum) REFERENCES Appointment(AppointmentSerNum)
    );
  `,
  getTimestamps: (patientId) => mysql.format(`
    SELECT
      AppointmentSerNum
      , UNIX_TIMESTAMP(FirstCheckinTime) AS FirstCheckinTime
      , UNIX_TIMESTAMP(ScheduledTime) AS ScheduledTime
      , UNIX_TIMESTAMP(ActualStartTime) AS ActualStartTime
    FROM UsersAppointmentsTimestamps
    WHERE
      PatientSerNum = ?
    ORDER BY
      AppointmentSerNum DESC;`, [patientId])
  ,
  registerTimestamps: (patientId, appointmentId, firstCheckin, scheduledTime, actualStartTime) =>
    mysql.format(`
    INSERT INTO UsersAppointmentsTimestamps (
      PatientSerNum
      , AppointmentSerNum
      , FirstCheckinTime
      , ScheduledTime
      , ActualStartTime
    ) VALUES (
      ?
      , ?
      , FROM_UNIXTIME(?)
      , FROM_UNIXTIME(?)
      , FROM_UNIXTIME(?)
    );
  `, [patientId, appointmentId, firstCheckin, scheduledTime, actualStartTime]),
  getAppointments: (patientId, knownAppointments) => {
    if (knownAppointments) {
      return mysql.format(`
        SELECT
          AppointmentSerNum
          , SourceDatabaseSerNum
          , AppointmentAriaSer
          , ActualStartDate
        FROM Appointment
        WHERE
          PatientSerNum = ?
          AND AppointmentSerNum NOT IN (?);`, [patientId, knownAppointments])
    } else {
      return mysql.format(`
        SELECT
          AppointmentSerNum
          , SourceDatabaseSerNum
          , AppointmentAriaSer
          , ActualStartDate
        FROM Appointment
        WHERE
          PatientSerNum = ?;`, [patientId]);
    }
  }
}

module.exports = _default
