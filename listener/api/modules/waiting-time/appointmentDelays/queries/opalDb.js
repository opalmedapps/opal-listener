const _default = {
  createTable: () => `
    CREATE TABLE IF NOT EXISTS AppointmentDelay (
      AppointmentDelaySerNum int(11) NOT NULL AUTO_INCREMENT
      , AppointmentType varchar(20) NOT NULL
      , AppointmentScheduledTimeDay int(1) NOT NULL
      , AppointmentScheduledTimeHour int(2) NOT NULL
      , AppointmentScheduledTimeMinutes int(2) NOT NULL
      , Set1 int(11) NOT NULL DEFAULT 0
      , Set2 int(11) NOT NULL DEFAULT 0
      , Set3 int(11) NOT NULL DEFAULT 0
      , Set4 int(11) NOT NULL DEFAULT 0
      , LastUpdate timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      , PRIMARY KEY (AppointmentDelaySerNum)
      , UNIQUE KEY AppointmentKeys (AppointmentType, AppointmentScheduledTimeDay, AppointmentScheduledTimeHour, AppointmentScheduledTimeMinutes)
    );
  `,
  getDelay: (appointmentType, scheduledDay, scheduledHour, scheduledMinutes) => `
    SELECT
      Set1
      , Set2
      , Set3
      , Set4
    FROM AppointmentDelay
    WHERE
      AppointmentType = '${appointmentType}'
      AND AppointmentScheduledTimeDay = ${scheduledDay}
      AND AppointmentScheduledTimeHour = ${scheduledHour}
      AND AppointmentScheduledTimeMinutes = ${scheduledMinutes}
      AND TIMESTAMPDIFF(HOUR, LastUpdate, NOW()) < 24;
  `,
  registerDelay: (appointmentType, scheduledDay, scheduledHour, scheduledMinutes, set1, set2, set3, set4) => `
    INSERT INTO AppointmentDelay (
      AppointmentType
      , AppointmentScheduledTimeDay
      , AppointmentScheduledTimeHour
      , AppointmentScheduledTimeMinutes
      , Set1
      , Set2
      , Set3
      , Set4
    ) VALUES (
      '${appointmentType}'
      , ${scheduledDay}
      , ${scheduledHour}
      , ${scheduledMinutes}
      , ${set1}
      , ${set2}
      , ${set3}
      , ${set4}
    ) ON DUPLICATE KEY UPDATE
      Set1=${set1}
      , Set2=${set2}
      , Set3=${set3}
      , Set4=${set4};
  `
}

module.exports = _default
