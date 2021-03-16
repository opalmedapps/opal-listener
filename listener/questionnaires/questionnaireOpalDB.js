var exports = module.exports = {};

const questionnaireQueries = require('./questionnaireQueries.js');
const questionnaires = require('./questionnaireQuestionnaireDB.js');
const opalQueries = require('../sql/queries');
const questionnaireValidation = require('./questionnaire.validate');
const logger = require('./../logs/logger');
const {OpalSQLQueryRunner} = require("../sql/opal-sql-query-runner");

exports.getQuestionnaireInOpalDB = getQuestionnaireInOpalDB;
exports.getQuestionnaireList = getQuestionnaireList;
exports.getQuestionnaire = getQuestionnaire;
exports.getQuestionnaireUnreadNumber = getQuestionnaireUnreadNumber;
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

    if (!questionnaireValidation.validateQuestionnaireCategory(requestObject)) {
        const paramErrMessage = "Error getting questionnaire list: the requestObject does not have the correct parameter category";
        logger.log("error", paramErrMessage);
        return Promise.reject(new Error(paramErrMessage));
    }

    return OpalSQLQueryRunner.run(opalQueries.patientTableFields(), [requestObject.UserID, lastUpdatedDateForGettingPatient])
        .then(function (patientSerNumAndLanguageRow) {

            if (questionnaireValidation.validatePatientSerNumAndLanguage(patientSerNumAndLanguageRow)) {
                // get questionnaire list
                return questionnaires.getQuestionnaireList(patientSerNumAndLanguageRow[0], requestObject.Parameters.category);
            } else {
                const questionnaireSerNumLanguageErrMessage = "Error getting questionnaire list: No matching PatientSerNum or/and Language found in opalDB";
                logger.log("error", questionnaireSerNumLanguageErrMessage);
                throw new Error(questionnaireSerNumLanguageErrMessage);
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
            const paramErrMessage = "Error getting questionnaire: the requestObject does not have the required parameter qp_ser_num";
            logger.log("error", paramErrMessage);
            reject(new Error(paramErrMessage));

        } else {
            // get language in the database
            OpalSQLQueryRunner.run(opalQueries.patientTableFields(), [requestObject.UserID, lastUpdatedDateForGettingPatient])
                .then(function (patientSerNumAndLanguageRow) {

                    if (questionnaireValidation.validatePatientSerNumAndLanguage(patientSerNumAndLanguageRow)) {
                        // get questionnaire belonging to that qp_ser_num
                        return questionnaires.getQuestionnaire(patientSerNumAndLanguageRow[0], requestObject.Parameters.qp_ser_num);
                    } else {
                        const questionnaireSerNumLanguageErrMessage = "Error getting questionnaire: No matching PatientSerNum or/and Language found in opalDB";
                        logger.log("error", questionnaireSerNumLanguageErrMessage);
                        reject(new Error(questionnaireSerNumLanguageErrMessage));
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

/**
 * getQuestionnaireUnreadNumber
 * @desc Returns a promise containing the number of unread (e.g. 'New') questionnaires of a given category for a particular user.
 * @param {object} requestObject
 * @return {Promise} Returns a promise that contains the number of unread questionnaires
 */
function getQuestionnaireUnreadNumber(requestObject) {

    if (!questionnaireValidation.validateQuestionnaireCategory(requestObject)) {
        const paramErrMessage = "Error getting number of unread questionnaires: the requestObject does not have the correct parameter category";
        logger.log("error", paramErrMessage);
        return Promise.reject(new Error(paramErrMessage));
    }

    return OpalSQLQueryRunner.run(opalQueries.getPatientSerNumFromUserID(), [requestObject.UserID])
        .then(function (patientSerNum) {
            if (questionnaireValidation.validatePatientSerNum(patientSerNum)) {
                // get number of unread questionnaires
                return questionnaires.getQuestionnaireUnreadNumber(patientSerNum[0], requestObject.Parameters.category);
            } else {
                const unreadNumberErrMessage = "Error getting number of unread questionnaires: No matching PatientSerNum found in opalDB";
                logger.log("error", unreadNumberErrMessage);
                throw new Error(unreadNumberErrMessage);
            }
        })
        .then(function (result) {
            let obj = {};
            obj.Data = result;
            return obj;
        })
        .catch(function (error) {
            logger.log("error", "Error getting number of unread questionnaires", error);
            throw new Error(error);
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
            const paramErrMessage = "Error saving answer: the requestObject does not have the required parameters";
            logger.log("error", paramErrMessage);
            reject(new Error(paramErrMessage));

        } else {
            // get language in the opal database
            OpalSQLQueryRunner.run(opalQueries.patientTableFields(), [requestObject.UserID, lastUpdatedDateForGettingPatient])
                .then(function (patientSerNumAndLanguageRow) {

                    if (questionnaireValidation.validatePatientSerNumAndLanguage(patientSerNumAndLanguageRow)) {
                        // save answer in questionnaire DB
                        return questionnaires.saveAnswer(patientSerNumAndLanguageRow[0], requestObject.Parameters, requestObject.AppVersion);
                    } else {
                        const questionnaireSerNumLanguageErrMessage = "Error saving answer: No matching PatientSerNum or/and Language found in opalDB";
                        logger.log("error", questionnaireSerNumLanguageErrMessage);
                        reject(new Error(questionnaireSerNumLanguageErrMessage));
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
            const paramErrMessage = "Error updating status: the requestObject does not have the required parameters";
            logger.log("error", paramErrMessage);
            reject(new Error(paramErrMessage));

        } else {
            let patientSerNumOpalDB;

            // 1. update the status in the answerQuestionnaire table in questionnaire DB
            // get patientSerNum in the opal database
            OpalSQLQueryRunner.run(opalQueries.patientTableFields(), [requestObject.UserID, lastUpdatedDateForGettingPatient])
                .then(function (patientSerNumAndLanguageRow) {
                    // check returns
                    if (!questionnaireValidation.validatePatientSerNumAndLanguage(patientSerNumAndLanguageRow)) {
                        const questionnaireSerNumLanguageErrMessage = "Error updating status: No matching PatientSerNum found in opalDB";
                        logger.log("error", questionnaireSerNumLanguageErrMessage);
                        reject(new Error(questionnaireSerNumLanguageErrMessage));
                    } else {
                        patientSerNumOpalDB = patientSerNumAndLanguageRow[0].PatientSerNum;
                        return questionnaires.updateQuestionnaireStatusInQuestionnaireDB(requestObject.Parameters.answerQuestionnaire_id, requestObject.Parameters.new_status, requestObject.AppVersion);
                    }

                }).then(function (isCompleted) {

                    // 2. update the status in the questionnaire table of the opal DB if completed
                    if (isCompleted === 1) {
                        return OpalSQLQueryRunner.run(questionnaireQueries.updateQuestionnaireStatus(), [isCompleted, requestObject.Parameters.answerQuestionnaire_id]);
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
