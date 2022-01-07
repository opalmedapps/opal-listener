const mysql = require("mysql");

class HospitalParkingQuery {

    /**
     * Retrieves all of a patient's hospital sites from the Patient_Hospital_Identifier table
     * @param {string|number} patientSerNum PatientSerNum in the DB
     * @returns {string} string query for retrieving patient's site codes
     */
    static getPatientHospitalIdentifiers(patientSerNum) {
        return mysql.format(
            `SELECT PHI.MRN, PHI.Hospital_Identifier_Type_Code FROM Patient_Hospital_Identifier PHI
            WHERE PHI.PatientSerNum = ?
            ;`, [patientSerNum]);
    }
}

module.exports = {HospitalParkingQuery};