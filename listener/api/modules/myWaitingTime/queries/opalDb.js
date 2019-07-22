const _default = {
  createTable: () => `
    CREATE TABLE IF NOT EXISTS UsersAppointmentsTimestamps (
      PatientSerNum int(11) NOT NULL
      , AppointmentSerNum int(11) NOT NULL
      , FirstCheckinTime datetime NOT NULL COMMENT 'First patients check-in in the hospital.'
      , ScheduledTime datetime NOT NULL COMMENT 'Appointments scheduled time.'
      , ActualStartTime datetime NOT NULL COMMENT 'The actual time the appointment really started.'
      , LastUpdate datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      , PRIMARY KEY (PatientSerNum, AppointmentSerNum)
      , FOREIGN KEY (PatientSerNum) REFERENCES Patient(PatientSerNum)
      , FOREIGN KEY (AppointmentSerNum) REFERENCES Appointment(AppointmentSerNum)
    );
  `,
  getTimestamps: () => `
    SELECT
      AppointmentSerNum
      , UNIX_TIMESTAMP(FirstCheckinTime) AS FirstCheckinTime
      , UNIX_TIMESTAMP(ScheduledTime) AS ScheduledTime
      , UNIX_TIMESTAMP(ActualStartTime) AS ActualStartTime
    FROM UsersAppointmentsTimestamps
    WHERE
      PatientSerNum = ?
    ORDER BY
      AppointmentSerNum DESC;
  `,
  registerTimestamps: (patientId, appointmentId, firstCheckin, scheduledTime, actualStartTime) => `
    INSERT INTO UsersAppointmentsTimestamps (
      PatientSerNum
      , AppointmentSerNum
      , FirstCheckinTime
      , ScheduledTime
      , ActualStartTime
    ) VALUES (
      ${patientId}
      , ${appointmentId}
      , FROM_UNIXTIME(${firstCheckin})
      , FROM_UNIXTIME(${scheduledTime})
      , FROM_UNIXTIME(${actualStartTime})
    );
  `,
  getAppointments: (patientId, knownAppointments) => `
    SELECT
      AppointmentSerNum
      , SourceDatabaseSerNum
      , AppointmentAriaSer
      , ActualStartDate
    FROM Appointment
    WHERE
      PatientSerNum = ${patientId}
      ${knownAppointments ? `AND AppointmentSerNum NOT IN (${knownAppointments.join(',')})` : ''};
  `
}

module.exports = _default
