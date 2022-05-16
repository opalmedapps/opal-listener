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

exports.InsertPatient = function () {
    return "SELECT reg_UpdatePatientInfo(?,?,?,?,?,?,?,?,?,?,?,?,?,?,?) AS Result; ";
};

exports.getSiteAndMrn = function() {
    return "SELECT PHI.MRN AS Mrn, PHI.Hospital_Identifier_Type_Code AS Site FROM Patient_Hospital_Identifier AS PHI INNER JOIN Patient AS P ON PHI.PatientSerNum = P.PatientSerNum AND P.SSN = ?;";
};

exports.getPatient = function() {
    return "SELECT \n" +
        "\tpatient.*, \n" +
        "\t`phi`.MRN,\n" +
        "\t`hit`.Description_EN AS hospital_name_EN,\n" +
        "\t`hit`.Description_FR AS hospital_name_FR\n" +
        "FROM Patient patient\n" +
        "JOIN Patient_Hospital_Identifier `phi` ON `phi`.PatientSerNum = patient.PatientSerNum\n" +
        "JOIN Hospital_Identifier_Type `hit` ON `hit`.code = `phi`.Hospital_Identifier_Type_Code\n" +
        "WHERE patient.SSN = ?;";
};

exports.getRamqByMRN = function() {
    return "SELECT \n" +
        "\tpatient.SSN \n" +
        "FROM Patient patient\n" +
        "JOIN Patient_Hospital_Identifier `phi` ON `phi`.PatientSerNum = patient.PatientSerNum\n" +
        "WHERE `phi`.MRN = ?;";
};

exports.getMRNByRegistrationCode = function() {
    return "SELECT \n" +
        "\tphi.MRN AS MRN,\n" +
        "\tregister.RegistrationCode AS RegistrationCode,\n" +
        "\tregister.Status AS Status\n" +
        "FROM OpalDB.Patient_Hospital_Identifier phi\n" +
        "JOIN registerdb.registrationcode register ON `phi`.PatientSerNum = register.PatientSerNum\n" +
        "WHERE register.FirebaseBranch = ?;";
}

