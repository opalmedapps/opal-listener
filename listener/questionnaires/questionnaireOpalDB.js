var exports = module.exports = {};

const questionnaireQueries = require('./questionnaireQueries.js');
const questionnaires = require('./questionnaireQuestionnaireDB.js');
const sqlInterface = require('./../api/sqlInterface.js');
const opalQueries = require('../sql/queries');
const questionnaireValidation = require('./questionnaire.validate');
const logger = require('./../logs/logger');

exports.getQuestionnaireList = getQuestionnaireList;
exports.getQuestionnaire = getQuestionnaire;
exports.questionnaireSaveAnswer = questionnaireSaveAnswer;
exports.questionnaireUpdateStatus = questionnaireUpdateStatus;

const lastUpdatedDateForGettingPatient = '0000-00-00';

/*
FUNCTIONS TO GET QUESTIONNAIRES (QUESTIONNAIRE V2)
 */

/**
 * getQuestionnaireList
 * @desc Returns a promise containing the questionnaires general information. Used for the new questionnaire 2019
 * @param {object} requestObject
 * @return {Promise} Returns a promise that contains a list of questionnaire data
 */
function getQuestionnaireList(requestObject) {

    if (!questionnaireValidation.validateQuestionnaireCategory(requestObject)) {
        logger.log("error", "Error getting questionnaire list: the requestObject does not have the correct parameter category");
        return Promise.reject(new Error('Error getting questionnaire list: the requestObject does not have the correct parameter category'));
    }

    return sqlInterface.runSqlQuery(opalQueries.patientTableFields(), [requestObject.UserID, lastUpdatedDateForGettingPatient])
        .then(function (patientSerNumAndLanguageRow) {

            if (questionnaireValidation.validatePatientSerNumAndLanguage(patientSerNumAndLanguageRow)) {
                // get questionnaire list
                return questionnaires.getQuestionnaireList(patientSerNumAndLanguageRow[0], requestObject.Parameters.category);
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
        if (!questionnaireValidation.validatePatientQuestionnaireSerNum(requestObject)) {
            logger.log("error", "Error getting questionnaire: the requestObject does not have the required parameter");
            reject(new Error('Error getting questionnaire: the requestObject does not have the required parameter qp_ser_num'));

        } else {
            // get language in the database
            sqlInterface.runSqlQuery(opalQueries.patientTableFields(), [requestObject.UserID, lastUpdatedDateForGettingPatient])
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
            sqlInterface.runSqlQuery(opalQueries.patientTableFields(), [requestObject.UserID, lastUpdatedDateForGettingPatient])
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
 * @desc this function is used to update the questionnaire status in both the OpalDB and the questionnaireDB
 * @param {object} requestObject
 * @returns {Promise}
 */
function questionnaireUpdateStatus(requestObject) {
    return new Promise(function (resolve, reject) {
        // check arguments
        if (!questionnaireValidation.validateParamUpdateStatus(requestObject)) {
            logger.log("error", "Error updating status: the requestObject does not have the required parameters");
            reject(new Error('Error updating status: the requestObject does not have the required parameters'));

        } else {
            let patientSerNumOpalDB;

            // 1. update the status in the answerQuestionnaire table in questionnaire DB
            // get patientSerNum in the opal database
            sqlInterface.runSqlQuery(opalQueries.patientTableFields(), [requestObject.UserID, lastUpdatedDateForGettingPatient])
                .then(function (patientSerNumAndLanguageRow) {
                    // check returns
                    if (!questionnaireValidation.validatePatientSerNumAndLanguage(patientSerNumAndLanguageRow)) {
                        logger.log("error", "Error updating status: No matching PatientSerNum found in opalDB");
                        reject(new Error('Error updating status: No matching PatientSerNum found in opalDB'));
                    } else {
                        patientSerNumOpalDB = patientSerNumAndLanguageRow[0].PatientSerNum;
                        return questionnaires.updateQuestionnaireStatusInQuestionnaireDB(requestObject.Parameters.answerQuestionnaire_id, requestObject.Parameters.new_status, requestObject.AppVersion);
                    }

                }).then(function (isCompleted) {

                    // 2. update the status in the questionnaire table of the opal DB if completed
                    if (isCompleted === 1) {
                        return sqlInterface.runSqlQuery(questionnaireQueries.updateQuestionnaireStatus(), [isCompleted, requestObject.Parameters.answerQuestionnaire_id]);
                        // TODO: do we rollback if this fails + insert log into DB
                    } else {
                        resolve({Response: 'success'});
                    }
                }).then(function () {
                    resolve({Response: 'success'});
                }).catch(function (err) {
                    logger.log("error", "Error updating status", err);
                    reject(err);
                });
        }
    });
}