const mysql = require("mysql");

class PatientSecurityQuestionQuery {

    /**
     * Query to return the list of active security questions
     * @returns {string} query the list of active security question existing in the database
     */
    static getActiveSecurityQuestionsQuery() {
        return mysql.format(
            `SELECT distinct sq.SecurityQuestionSerNum, sq.QuestionText_EN, sq.QuestionText_FR, sq.Active
            FROM SecurityAnswer sa, SecurityQuestion sq
            WHERE sq.Active = 1;`);
    }

    /**
     * Query to return the list of security questions with an answer regardless of being active or not
     * @param {string|number} patientSerNum PatientSerNum in the DB
     * @returns {string} query the list of security questions with an answer for a specific patient
     */
    static getSecurityQuestionsWithAnswerQuery(patientSerNum) {
        return mysql.format(
            `SELECT sq.SecurityQuestionSerNum, sa.SecurityAnswerSerNum, sq.QuestionText_EN, sq.QuestionText_FR, sq.Active
            FROM SecurityAnswer sa, SecurityQuestion sq
            WHERE sa.SecurityQuestionSerNum = sq.SecurityQuestionSerNum
                AND sa.PatientSerNum = ?
            ;`, [patientSerNum]);
    }

    /**
     * updateSecurityQuestionAnswerQuery
     * @desc Query to update a security answer and/or question
     * @param {string|number} securityQuestionSerNum the SerNum of the new or the old question
     * @param {string} answerText The hashed answer string
     * @param {string|number} securityAnswerSerNum the SerNum that the old answer uses
     * @param {string|number} patientSerNum PatientSerNum in the DB
     * @returns {string} string query for updating the security question or answer for a specific patient.
     *      Returns [{}] OkPacket containing fieldCount, affectedRows, insertId, serverStatus, warningCount, message, protocol41, changedRows     *
     */
    static updateSecurityQuestionAnswerQuery(securityQuestionSerNum, answerText, securityAnswerSerNum, patientSerNum) {
        return mysql.format(
            `UPDATE SecurityAnswer SET SecurityQuestionSerNum = ?, AnswerText = ? WHERE SecurityAnswerSerNum = ? AND PatientSerNum = ?;`,
            [securityQuestionSerNum, answerText, securityAnswerSerNum, patientSerNum]
        );
    }

    /**
     * getSecurityAnswerTableQuery
     * @desc Query to copy the security answer table for a certain patient
     * @param {string|number} patientSerNum PatientSerNum in the DB
     * @returns {string} query all security answers for a patient
     */
    static getSecurityAnswerTableQuery(patientSerNum) {
        return mysql.format(
            `SELECT * FROM SecurityAnswer WHERE PatientSerNum = ?;`,
            [patientSerNum]
        );
    }

    /**
     * replaceSecurityAnswerQuery
     * @param {object} row1 the 1st row in the SecurityAnswer table
     * @param {object} row2 the 2nd row in the SecurityAnswer table
     * @param {object} row3 the 3rd row in the SecurityAnswer table
     * @returns {string} query to replace the field in SecurityAnswer table with the previous fields
     */
    static replaceSecurityAnswerQuery(row1, row2, row3) {
        return mysql.format(
            `REPLACE INTO SecurityAnswer (SecurityAnswerSerNum, SecurityQuestionSerNum, PatientSerNum, AnswerText, CreationDate, LastUpdated) 
            VALUES 
            (?, ?, ?, ?, ?, ?),
            (?, ?, ?, ?, ?, ?),
            (?, ?, ?, ?, ?, ?);`,
            [row1.SecurityAnswerSerNum, row1.SecurityQuestionSerNum, row1.PatientSerNum, row1.AnswerText, row1.CreationDate, row1.LastUpdated,
                row2.SecurityAnswerSerNum, row2.SecurityQuestionSerNum, row2.PatientSerNum, row2.AnswerText, row2.CreationDate, row2.LastUpdated,
                row3.SecurityAnswerSerNum, row3.SecurityQuestionSerNum, row3.PatientSerNum, row3.AnswerText, row3.CreationDate, row3.LastUpdated]
        );
    }
}

module.exports = {PatientSecurityQuestionQuery};
