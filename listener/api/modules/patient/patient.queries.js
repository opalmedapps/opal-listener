// SPDX-FileCopyrightText: Copyright 2020 Opal Health Informatics Group at the Research Institute of the McGill University Health Centre <john.kildea@mcgill.ca>
//
// SPDX-License-Identifier: AGPL-3.0-or-later

const mysql = require("mysql");
class PatientQueries {
    /**
     * Returns patient query given a username
     * @param {string} username Username for patient
     * @returns string string query
     */
    static getPatientByUsernameQuery(username) {
        return mysql.format(`SELECT * FROM Patient as pat, Users as u
                WHERE pat.PatientSerNum = u.UserTypeSerNum AND u.Username = ?;`, username);
    }

    /**
     * @desc Query that looks up a patient based on their PatientSerNum.
     * @param {string} patientSerNum The patient's PatientSerNum.
     * @returns {string} The query.
     */
    static getPatientBySerNumQuery(patientSerNum) {
        return mysql.format(`
            SELECT *
            FROM Patient as p
            WHERE p.PatientSerNum = ?
            ;
        `, patientSerNum);
    }
}
module.exports = PatientQueries;
