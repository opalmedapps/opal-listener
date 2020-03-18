const mysql = require("mysql");
class PatientQueries {
    /**
     * Returns patient query given a username
     * @param {string} username Username for patient
     * @returns string string query
     */
    static getPatientQuery(username) {
        return mysql.format(`SELECT * FROM Patient as pat, Users as u 
                WHERE pat.PatientSerNum = u.UserTypeSerNum AND u.Username = ?;`, username);
    }

}
module.exports = PatientQueries;