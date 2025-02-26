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
