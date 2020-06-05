const mysql = require("mysql");
class PatientQueries {
    /**
     * Returns patient query given a username
     * @param {string} username Username for patient
     * @returns string string query
     */
    static getPatientByUsernameQuery(username) {
        return mysql.format(`SELECT p.*, u.* 
                FROM Patient AS p, Users AS u, UserPatient AS up 
                WHERE p.PatientSerNum = up.PatientSerNum
                    AND up.UserSerNum = u.UserSerNum
                    AND u.Username = ?;`, username);
    }

}
module.exports = PatientQueries;