exports.getRequestEncryption = function () {
    return "CALL reg_BranchSearch(?);";
};

exports.insertIPLog = function () {
    return "SELECT insertIPLog(?) AS Result;";
};

exports.validateIP = function () {
    return "SELECT validateIP(?) AS Result;";
};

exports.validateInputs = function () {
    return "SELECT validateInputs(?,?,?) AS Result;";
};

exports.getSecQuestionsList = function () {
     return "CALL reg_getSecurityQuestions(?);";
};

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

exports.validatePatient = function () {
    return "SELECT validatePatient(?) AS Result;";
};

exports.getSiteAndMrn = function() {
    return "SELECT PHI.MRN AS Mrn, PHI.Hospital_Identifier_Type_Code AS Site FROM Patient_Hospital_Identifier AS PHI INNER JOIN Patient AS P ON PHI.PatientSerNum = P.PatientSerNum AND P.SSN = ?;";
}

