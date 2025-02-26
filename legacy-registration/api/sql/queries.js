exports.insertPatient = () => {
    return `INSERT INTO Patient(FirstName, LastName, Sex, DateOfBirth, Age, Email, Language, SSN, AccessLevel, RegistrationDate)
            VALUES (?, ?, ?, ?, TIMESTAMPDIFF(year, ?, now()), ?, ?, ?, ?, NOW());
    `;
};

exports.insertDummyPatient = () => {
    return `INSERT INTO Patient(FirstName, LastName, Sex, DateOfBirth, Email, Language, SSN)
            VALUES (?, ?, 'Unknown', '0000-00-00 00:00:00', ?, ?, '');
    `;
};

exports.insertUser = () => {
    return `INSERT INTO Users (UserType, UserTypeSerNum, Username, Password, SessionId)
            VALUES ('Patient', ?, ?, ?, '');
    `;
};

exports.updateSelfPatientInfo = () => {
    return `UPDATE Patient
            SET
                Email = ?,
                Language = ?,
                TelNum = ?,
                EnableSMS = 0,
                AccessLevel = ?,
                RegistrationDate = NOW(),
                ConsentFormExpirationDate = DATE_ADD(NOW(), INTERVAL 1 YEAR),
                TermsAndAgreementSign = ?,
                TermsAndAgreementSignDateTime = NOW()
            WHERE PatientSerNum = ?;
    `;
}

exports.insertPatientControl = () => {
    return `INSERT IGNORE INTO PatientControl (PatientSerNum)
            VALUES (?);
    `;
}

exports.insertPatientHospitalIdentifier = function () {
    return "SELECT reg_insertPatientHospitalIdentifier(?,?,?) AS Result;";
};

exports.getPatientSerNumFromUserSerNum = function () {
    return `SELECT p.PatientSerNum
            FROM Patient p, Users u
            WHERE u.UserTypeSerNum = p.PatientSerNum
              AND u.UserSerNum = ?
            ;
    `;
}
