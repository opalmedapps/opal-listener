const {PatientSecurityQuestionQuery} = require("../queries/patient-security-question.queries");
const logger = require("../../../../../logs/logger");
const {OpalSQLQueryRunner} = require("../../../../../sql/opal-sql-query-runner");

class PatientSecurityQuestion {
    /**
     * Base constructor takes a patient
     * @param {Patient} patient
     */
    constructor(patient) {
        this._patient = patient;
    }

    /**
     * getActiveSecurityQuestionList
     * @desc get the list of active security questions from the Opal database
     * @returns {Promise<[]>} list of active security questions
     */
    async getActiveSecurityQuestionList() {
        const query = PatientSecurityQuestionQuery.getActiveSecurityQuestionsQuery();
        let securityQuestionList;

        try {
            securityQuestionList = await OpalSQLQueryRunner.run(query);
        } catch (err) {
            logger.log("error", "SQL: could not obtain active security question list", {error: err});
            throw err;
        }

        return securityQuestionList;
    }

    /**
     * getSecurityAnswerList
     * @desc get the list of security answers and their corresponding question for the patient
     * @returns {Promise<[]>} the list of security answers
     */
    async getSecurityAnswerList() {
        const securityQuestionWithAnsQuery = PatientSecurityQuestionQuery.getSecurityQuestionsWithAnswerQuery(this._patient.patientSerNum);
        let securityQuestionWithAnsList;

        try {
            securityQuestionWithAnsList = await OpalSQLQueryRunner.run(securityQuestionWithAnsQuery);
        } catch (err) {
            logger.log("error", `SQL: could not obtain security answer list for patient ${this._patient}`, {error: err});
            throw err;
        }

        return securityQuestionWithAnsList;
    }

    /**
     * updateSecurityQuestionAndAnswer
     * @desc update the answer of a security question, or change the security question itself.
     *      If the update fails, replace the security answers with the original ones.
     *      Note that we do not use transactions here since they might result in deadlocks.
     * @param {array} questionAnswerArr an array containing objects with properties: questionSerNum, answer, securityAnswerSerNum
     * @returns {Promise}
     */
    async updateSecurityQuestionAndAnswer(questionAnswerArr) {
        const patientSerNum = this._patient.patientSerNum;
        let promiseArr = [];
        let result;

        // get a copy of the original security answers for the patient in case of a failure to update security questions
        let originalSecurityAnswerTable = await this.getPatientSecurityAnswerTable();

        questionAnswerArr.forEach(function(questionAnswerObj) {
            promiseArr.push(
                OpalSQLQueryRunner.run(
                    PatientSecurityQuestionQuery.updateSecurityQuestionAnswerQuery(
                        questionAnswerObj.questionSerNum,
                        questionAnswerObj.answer,
                        questionAnswerObj.securityAnswerSerNum,
                        patientSerNum
                    )
                )
            );
        });

        try {
            logger.log("debug", `SQL: attempting to update security question and/or answer for patient ${this._patient}`);

            result = await Promise.all(promiseArr);

        } catch (err) {
            logger.log("error", `SQL: could not update security question and/or answer for patient ${this._patient}`, {error: err});

            await this.rollbackSecurityAnswerChange(originalSecurityAnswerTable);

            throw err;
        }

        return result;
    }

    /**
     * getPatientSecurityAnswerTable
     * @desc get the original security answer records related to a patient
     * @returns {Promise<[]>}
     */
    async getPatientSecurityAnswerTable() {
        const getSecurityAnswerTableQuery = PatientSecurityQuestionQuery.getSecurityAnswerTableQuery(this._patient.patientSerNum);
        let originalSecurityAnswerTable = [];

        try {
            originalSecurityAnswerTable = await OpalSQLQueryRunner.run(getSecurityAnswerTableQuery);

            if (originalSecurityAnswerTable.length !== 3) {
                logger.log("error", `${this._patient} does not have exactly 3 security questions or answers`);

                // this is thrown here to be caught in the following catch block
                throw new Error(`${this._patient} does not have exactly 3 security questions or answers`);
            }

        } catch (err) {
            logger.log("error", `SQL: could not get security answer for patient ${this._patient}`, {error: err});
            throw err;
        }

        return originalSecurityAnswerTable;
    }

    /**
     * rollbackSecurityAnswerChange
     * @desc in case of failure of updating the security answers, place the original answers' records back
     * @param {array} originalSecurityAnswerTable
     * @returns {Promise}
     */
    async rollbackSecurityAnswerChange(originalSecurityAnswerTable) {
        let result;

        logger.log("debug", `SQL: attempting to rollback security question or answer change for patient ${this._patient}`);
        try {
            result = await OpalSQLQueryRunner.run(
                PatientSecurityQuestionQuery.replaceSecurityAnswerQuery(
                    originalSecurityAnswerTable[0],
                    originalSecurityAnswerTable[1],
                    originalSecurityAnswerTable[2]
                ));

            logger.log("debug", `SQL: successful rollback of security question or answer change for patient ${this._patient}`);

        } catch (err) {
            logger.log("error", `SQL: could not rollback security question or answer change for patient ${this._patient}`, {error: err});
            throw err;
        }

        return result;
    }
}

module.exports = {PatientSecurityQuestion};
