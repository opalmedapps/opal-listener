const _default = {
  createTable: () => `
    CREATE TABLE IF NOT EXISTS UsersAppointmentsTimestamps (
      PatientSerNum int(11) NOT NULL
      , AppointmentSerNum int(11) NOT NULL
      , FirstCheckinTime datetime NOT NULL COMMENT 'First patient\'s check-in in the hospital.'
      , ScheduledTime datetime NOT NULL COMMENT 'Appointment\'s scheduled time.'
      , ActualStartTime datetime NOT NULL COMMENT 'The actual time the appointment really started.'
      , LastUpdate datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      , PRIMARY KEY (PatientSerNum, AppointmentSerNum)
      , FOREIGN KEY (PatientSerNum) REFERENCES Patient(PatientSerNum)
      , FOREIGN KEY (AppointmentSerNum) REFERENCES Appointment(AppointmentSerNum)
    );
  `,
  getTimestamps: (patientId) => `
    SELECT
      AppointmentSerNum,
      FirstCheckinTime,
      ScheduledTime,
      ActualStartTime
    FROM UsersAppointmentsTimestamps
    WHERE
      PatientSerNum = ${patientId}
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
      , FROM_UNIXTIME(${firstCheckin.getTime() / 1000})
      , FROM_UNIXTIME(${scheduledTime.getTime() / 1000})
      , FROM_UNIXTIME(${actualStartTime.getTime() / 1000})
    );
  `,
  getAppointments: (patientId, knownAppointments) => `
    SELECT
      AppointmentSerNum,
      SourceDatabaseSerNum,
      AppointmentAriaSer,
      ScheduledStartTime
    FROM Appointment
    WHERE
      PatientSerNum = ${patientId}
      ${knownAppointments ? `AND AppointmentSerNum NOT IN (${knownAppointments.join(',')})` : ''};
  `
}

module.exports = _default
