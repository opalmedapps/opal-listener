exports.updatePatient = function () {
    return "SELECT reg_UpdatePatientInfo(?,?,?,?,?,?,?,?,?,?,?,?,?,?,?) AS Result;";
};

exports.insertPatient = () => {
    return `INSERT INTO Patient(FirstName, LastName, Sex, DateOfBirth, Age, TelNum, EnableSMS, Email, Language, SSN)
            VALUES (?, ?, ?, ?, TIMESTAMPDIFF(year, ?, now()), ?, 0, ?, ?, ?);
    `;
}

exports.insertPatientHospitalIdentifier = function () {
    return "SELECT reg_insertPatientHospitalIdentifier(?,?,?) AS Result;";
};

exports.getSiteAndMrn = function() {
    return "SELECT PHI.MRN AS Mrn, PHI.Hospital_Identifier_Type_Code AS Site FROM Patient_Hospital_Identifier AS PHI INNER JOIN Patient AS P ON PHI.PatientSerNum = P.PatientSerNum AND P.SSN = ?;";
};
