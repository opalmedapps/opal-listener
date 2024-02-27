exports.insertPatient = () => {
    return `INSERT INTO Patient(FirstName, LastName, Sex, DateOfBirth, Age, Email, Language, SSN, AccessLevel, RegistrationDate)
            VALUES (?, ?, ?, ?, TIMESTAMPDIFF(year, ?, now()), ?, ?, ?, ?, NOW());
    `;
};

/**
 * @description Query to insert a mostly empty dummy row in the Patient table, used as a necessary "self" placeholder
 *              for Caregivers who don't have a self relationship.
 * @returns {string} The query.
 */
exports.insertDummyPatient = () => {
    return `INSERT INTO Patient(FirstName, LastName, Sex, DateOfBirth, Email, Language, SSN)
            VALUES (?, ?, 'Unknown', '0000-00-00 00:00:00', ?, ?, '');
    `;
};

exports.insertUser = () => {
    return `INSERT INTO Users (UserType, UserTypeSerNum, Username, Password, SessionId)
            VALUES (?, ?, ?, ?, '');
    `;
};

/**
 * @description Query to update the fields relevant to the "self" user in the Patient table.
 * @returns {string} The query.
 */
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
    return `SELECT p.PatientSerNum, p.TelNum
            FROM Patient p, Users u
            WHERE u.UserTypeSerNum = p.PatientSerNum
              AND u.UserSerNum = ?
            ;
    `;
}
