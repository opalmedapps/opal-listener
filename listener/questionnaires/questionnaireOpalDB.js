var exports = module.exports = {};

const questionnaireQueries = require('./questionnaireQueries.js');
const questionnaires = require('./questionnaireQuestionnaireDB.js');
const opalQueries = require('../sql/queries');
const questionnaireValidation = require('./questionnaire.validate');
const logger = require('./../logs/logger');
const {OpalSQLQueryRunner} = require("../sql/opal-sql-query-runner");
const config = require("../config.json");
const requestUtility = require("../utility/request-utility");

exports.getQuestionnaireInOpalDB = getQuestionnaireInOpalDB;
exports.getQuestionnaireList = getQuestionnaireList;
exports.getQuestionnaire = getQuestionnaire;
exports.questionnaireSaveAnswer = questionnaireSaveAnswer;
exports.questionnaireUpdateStatus = questionnaireUpdateStatus;

const lastUpdatedDateForGettingPatient = '0000-00-00';

/*
FUNCTIONS TO GET QUESTIONNAIRES (QUESTIONNAIRE V2)
 */

/**
 * getQuestionnaireInOpalDB
 * @desc Returns a promise containing the questionnaire's general information stored in OpalDB. Used for the new questionnaire 2019
 * @param {object} requestObject
 * @returns {Promise} object containing the questionnaire's general information stored in OpalDB
 */
function getQuestionnaireInOpalDB(requestObject) {
    return new Promise(function(resolve, reject) {
        if (!questionnaireValidation.validateQuestionnaireSerNum(requestObject)) {

            const paramErrMessage = "Error getting questionnaire data stored in OpalDB: the requestObject does not have the required parameters";
            logger.log("error", paramErrMessage);
            reject(new Error(paramErrMessage));

        } else {
            OpalSQLQueryRunner.run(questionnaireQueries.getQuestionnaireInOpalDBFromSerNum(), [requestObject.Parameters.questionnaireSerNum])
                .then(function (rows) {
                    if (rows.length !== 1) {

                        const questionnaireSerNumErrMessage = `Error getting questionnaire data stored in OpalDB: the questionnaireSerNum ${requestObject.Parameters.questionnaireSerNum} does not have exactly one matching questionnaire`;
                        logger.log("error", questionnaireSerNumErrMessage);
                        reject(new Error(questionnaireSerNumErrMessage));

                    } else {
                        let obj = {};
                        obj.Data = rows[0];
                        resolve(obj);
                    }
                })
                .catch(function (error) {
                    logger.log("error", "Error getting questionnaire data stored in OpalDB", error);
                    reject(error);
                });
        }
    });
}

/**
 * getQuestionnaireList
 * @desc Returns a promise containing the questionnaire list for a particular user. Used for the new questionnaire 2019
 * @param {object} requestObject
 * @return {Promise} Returns a promise that contains a list of questionnaire data
 */
function getQuestionnaireList(requestObject) {

    return OpalSQLQueryRunner.run(opalQueries.patientTableFields(), [requestObject.UserID, lastUpdatedDateForGettingPatient])
        .then(function (patientSerNumAndLanguageRow) {

            if (questionnaireValidation.validatePatientSerNumAndLanguage(patientSerNumAndLanguageRow)) {
                // get questionnaire list
                return questionnaires.getQuestionnaireList(patientSerNumAndLanguageRow[0]);
            } else {
                logger.log("error", "Error getting questionnaire list: No matching PatientSerNum or/and Language found in opalDB");
                throw new Error('Error getting questionnaire list: No matching PatientSerNum or/and Language found in opalDB');
            }
        })
        .then(function (result) {
            let obj = {};
            obj.Data = result;
            return obj;
        })
        .catch(function (error) {
            logger.log("error", "Error getting questionnaire list", error);
            throw new Error(error);
        });
}

/**
 * getQuestionnaire
 * @desc Returns a promise containing the questionnaires and answers. Used for new questionnaire 2019
 * @param {object} requestObject the request
 * @returns {Promise} Returns a promise that contains the questionnaire data
 */
function getQuestionnaire(requestObject) {

    return new Promise(function (resolve, reject) {
        // check argument
        if (!questionnaireValidation.validatingPatientQuestionnaireSerNum(requestObject)) {
            reject(new Error('Error getting questionnaire: the requestObject does not have the required parameter qp_ser_num'));

        } else {
            // get language in the database
            OpalSQLQueryRunner.run(opalQueries.patientTableFields(), [requestObject.UserID, lastUpdatedDateForGettingPatient])
                .then(function (patientSerNumAndLanguageRow) {

                    if (questionnaireValidation.validatePatientSerNumAndLanguage(patientSerNumAndLanguageRow)) {
                        // get questionnaire belonging to that qp_ser_num
                        return questionnaires.getQuestionnaire(patientSerNumAndLanguageRow[0], requestObject.Parameters.qp_ser_num);
                    } else {
                        logger.log("error", "Error getting questionnaire: No matching PatientSerNum or/and Language found in opalDB");
                        reject(new Error('Error getting questionnaire: No matching PatientSerNum or/and Language found in opalDB'));
                    }
                })
                .then(function (result) {
                    let obj = {};
                    obj.Data = result;
                    resolve(obj);
                })
                .catch(function (error) {
                    logger.log("error", "Error getting questionnaire", error);
                    reject(error);
                });
        }
    });
}

/*
FUNCTIONS TO SAVE ANSWERS (QUESTIONNAIRE V2)
 */
/**
 * @name questionnaireSaveAnswer
 * @desc save the answer of one question
 * @param {object} requestObject
 * @returns {Promise}
 */
function questionnaireSaveAnswer(requestObject) {
    return new Promise(function (resolve, reject) {
        // check argument
        if (!questionnaireValidation.validateParamSaveAnswer(requestObject)) {
            logger.log("error", "Error saving answer: the requestObject does not have the required parameters");
            reject(new Error('Error saving answer: the requestObject does not have the required parameters'));

        } else {
            // get language in the opal database
            OpalSQLQueryRunner.run(opalQueries.patientTableFields(), [requestObject.UserID, lastUpdatedDateForGettingPatient])
                .then(function (patientSerNumAndLanguageRow) {

                    if (questionnaireValidation.validatePatientSerNumAndLanguage(patientSerNumAndLanguageRow)) {
                        // save answer in questionnaire DB
                        return questionnaires.saveAnswer(patientSerNumAndLanguageRow[0], requestObject.Parameters, requestObject.AppVersion);
                    } else {
                        logger.log("error", "Error saving answer: No matching PatientSerNum or/and Language found in opalDB");
                        reject(new Error('Error saving answer: No matching PatientSerNum or/and Language found in opalDB'));
                    }

                })
                .then(function () {
                    // no need to update opalDB questionnaire status since it is not completed.
                    resolve({Response: 'success'});

                })
                .catch(function (error) {
                    logger.log("error", "Error saving answer", error);
                    reject(error);
                });
        }
    });
}

/**
 * @name questionnaireUpdateStatus
 * @desc Updates the questionnaire status in both the OpalDB and the QuestionnaireDB.
 *       Also notifies the OIE if the questionnaire's new status is completed.
 * @param {object} requestObject
 * @returns {Promise<{Response: string}>} Resolves with a "success" response, or rejects with an error.
 */
async function questionnaireUpdateStatus(requestObject) {
    // Validate the parameters
    if (!questionnaireValidation.validateParamUpdateStatus(requestObject)) {
        throw new Error('Error updating status: the requestObject does not have the required parameters');
    }

    // 1. update the status in the answerQuestionnaire table in questionnaire DB
    // First, get the patientSerNum in the opal database
    let patientSerNumAndLanguageRow = await OpalSQLQueryRunner.run(opalQueries.patientTableFields(), [requestObject.UserID, lastUpdatedDateForGettingPatient]);

    if (!questionnaireValidation.validatePatientSerNumAndLanguage(patientSerNumAndLanguageRow)) {
        throw new Error('Error updating status: No matching PatientSerNum found in opalDB');
    }

    const isCompleted = await questionnaires.updateQuestionnaireStatusInQuestionnaireDB(requestObject.Parameters.answerQuestionnaire_id, requestObject.Parameters.new_status, requestObject.AppVersion);

    if (isCompleted === 1) {

        // 2. update the status in the questionnaire table of the opal DB if completed
        await OpalSQLQueryRunner.run(questionnaireQueries.updateQuestionnaireStatus(), [isCompleted, requestObject.Parameters.answerQuestionnaire_id]);
        // TODO: do we rollback if this fails + insert log into DB

        // 3. If the questionnaire is completed, notify the OIE. If an error occurs, don't cause the whole function to fail.
        try {
            logger.log("info", "Notifying the OIE that a questionnaire was completed.");
            if (!config.QUESTIONNAIRE_COMPLETED_PATH || config.QUESTIONNAIRE_COMPLETED_PATH === "") {
                throw "No value was provided for QUESTIONNAIRE_COMPLETED_PATH in the config file.";
            }
            await requestUtility.request("post", config.QUESTIONNAIRE_COMPLETED_PATH, { json: true });
        }
        catch (error) {
            logger.log("error", `Failed to send notification of completed questionnaire to the OIE: ${JSON.stringify(error)}`);
        }
    }

    return {Response: 'success'};
}
