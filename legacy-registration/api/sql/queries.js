exports.getAccessLevelList = function () {
    return "CALL reg_getAccessLevelList(?);";
};

exports.getLanguageList = function () {
    return "CALL reg_getLanguageList(?);";
};

exports.getTermsandAgreementDocuments = function () {
    return "CALL reg_getTermsandAggrementDocuments(?);";
};

exports.updatePatient = function () {
    return "SELECT reg_UpdatePatientInfo(?,?,?,?,?,?,?,?,?,?,?,?,?,?,?) AS Result;";
};

exports.insertPatient = function () {
    return "SELECT insertPatient(?,?,?,?,?,?) AS Result;";
};

exports.insertPatientHospitalIdentifier = function () {
    return "SELECT reg_insertPatientHospitalIdentifier(?,?,?) AS Result;";
};

exports.getSiteAndMrn = function() {
    return "SELECT PHI.MRN AS Mrn, PHI.Hospital_Identifier_Type_Code AS Site FROM Patient_Hospital_Identifier AS PHI INNER JOIN Patient AS P ON PHI.PatientSerNum = P.PatientSerNum AND P.SSN = ?;";
};

exports.getPatient = function() {
    return `
        SELECT patient.FirstName, patient.LastName, patient.TelNum, patient.BlockedStatus, \`phi\`.MRN, \`hit\`.Description_EN AS hospital_name_EN, \`hit\`.Description_FR AS hospital_name_FR
        FROM Patient patient
        JOIN Patient_Hospital_Identifier \`phi\` ON \`phi\`.PatientSerNum = patient.PatientSerNum
        JOIN Hospital_Identifier_Type \`hit\` ON \`hit\`.code = \`phi\`.Hospital_Identifier_Type_Code WHERE patient.SSN = ?;
    `;
};

/**
 * @desc Query that marks all expired registration branches for deletion by setting their DeleteBranch flag to 1.
 * @returns {string} The query.
 */
exports.flagFirebaseBranchesForDeletion = () => {
    return `UPDATE registrationcode
            SET DeleteBranch = 1
            WHERE Status = 'Expired'
              AND DeleteBranch = 0
            ;
    `;
}

/**
 * @desc Query that returns all firebase branch names marked for deletion (with DeleteBranch = 1).
 * @returns {string} The query.
 */
exports.getFirebaseBranchesToDelete = () => {
    return `SELECT FirebaseBranch
            FROM registrationcode
            WHERE DeleteBranch = 1;
    `;
}

/**
 * @desc Query that marks a set of firebase branches as deleted (by setting DeleteBranch = 2).
 * @returns {string} The query.
 */
exports.markFirebaseBranchesAsDeleted = () => {
    return `UPDATE registrationcode
            SET DeleteBranch = 2
            WHERE FirebaseBranch IN ?;`
}
