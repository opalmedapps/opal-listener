const questionnaireQueries = require('./questionnaireQueries.js');
const questionnaires = require('./questionnaireQuestionnaireDB.js');
const opalQueries = require('../sql/queries');
const questionnaireValidation = require('./questionnaire.validate');
const logger = require('./../logs/logger');
const {OpalSQLQueryRunner} = require("../sql/opal-sql-query-runner");
const config = require("../config-adaptor");
const requestUtility = require("../utility/request-utility");

exports.getQuestionnaireInOpalDB = getQuestionnaireInOpalDB;
exports.getQuestionnaireList = getQuestionnaireList;
exports.getQuestionnaire = getQuestionnaire;
exports.getQuestionnairePurpose = getQuestionnairePurpose;
exports.getQuestionnaireUnreadNumber = getQuestionnaireUnreadNumber;
exports.questionnaireSaveAnswer = questionnaireSaveAnswer;
exports.questionnaireUpdateStatus = questionnaireUpdateStatus;

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
 * @deprecated Since QSCCD-230
 * @param {object} requestObject
 * @return {Promise} Returns a promise that contains a list of questionnaire data
 */
function getQuestionnaireList(requestObject) {

    if (!questionnaireValidation.validateQuestionnairePurpose(requestObject)) {
        const paramErrMessage = "Error getting questionnaire list: the requestObject does not have the correct parameter purpose";
        logger.log("error", paramErrMessage);
        return Promise.reject(new Error(paramErrMessage));
    }

    return OpalSQLQueryRunner.run(opalQueries.patientTableFieldsForUser(), [requestObject.UserID])
        .then(function (patientSerNumAndLanguageRow) {

            if (questionnaireValidation.validatePatientSerNumAndLanguage(patientSerNumAndLanguageRow)) {
                const lastUpdated = requestObject.params.Date ? new Date(Number(requestObject.params.Date)) : 0;
                // get questionnaire list
                return questionnaires.getQuestionnaireList(
                    patientSerNumAndLanguageRow[0],
                    requestObject.Parameters.purpose,
                    lastUpdated
                );
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
// TODO (QSCCD-84) - Make use of requestObject.TargetPatientID to get the another patient's questionnaire, but in the current user's language
function getQuestionnaire(requestObject) {

    return new Promise(function (resolve, reject) {
        // check argument
        if (!questionnaireValidation.validatePatientQuestionnaireSerNum(requestObject)) {
            const paramErrMessage = "Error getting questionnaire: the requestObject does not have the required parameter qp_ser_num";
            logger.log("error", paramErrMessage);
            reject(new Error(paramErrMessage));

        } else {
            // get language in the database
            OpalSQLQueryRunner.run(opalQueries.patientTableFieldsForUser(), [requestObject.UserID])
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
 * getQuestionnairePurpose
 * @desc Returns a promise containing the purpose of a given questionnaire.
 * @param {object} requestObject
 * @return {Promise} Returns a promise that contains the questionnaire purpose.
 */
function getQuestionnairePurpose(requestObject) {
    if (!questionnaireValidation.validatePatientQuestionnaireSerNum(requestObject)) {
        const paramErrMessage = "Error getting questionnaire purpose: the requestObject does not have the correct parameter qp_ser_num";
        logger.log("error", paramErrMessage);
        return Promise.reject(new Error(paramErrMessage));
    }

    return questionnaires.getQuestionnairePurpose(requestObject.Parameters.qp_ser_num)
        .then(function (result) {
            let obj = {};
            obj.Data = result;
            return obj;
        })
        .catch(function (error) {
            logger.log("error", "Error getting questionnaire purpose", error);
            throw new Error(error);
        });
}

/**
 * getQuestionnaireUnreadNumber
 * @desc Returns a promise containing the number of unread (e.g. 'New') questionnaires of a given purpose for a particular user.
 * @param {object} requestObject
 * @return {Promise} Returns a promise that contains the number of unread questionnaires
 */
function getQuestionnaireUnreadNumber(requestObject) {

    if (!questionnaireValidation.validateQuestionnairePurpose(requestObject)) {
        const paramErrMessage = "Error getting number of unread questionnaires: the requestObject does not have the correct parameter purpose";
        logger.log("error", paramErrMessage);
        return Promise.reject(new Error(paramErrMessage));
    }

    return OpalSQLQueryRunner.run(opalQueries.getPatientSerNumFromUserID(), [requestObject.UserID])
        .then(function (patientSerNum) {
            if (questionnaireValidation.validatePatientSerNum(patientSerNum)) {
                // get number of unread questionnaires
                return questionnaires.getQuestionnaireUnreadNumber(patientSerNum[0], requestObject.Parameters.purpose);
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
            OpalSQLQueryRunner.run(opalQueries.patientTableFieldsForUser(), [requestObject.UserID])
                .then(function (patientSerNumAndLanguageRow) {

                    if (questionnaireValidation.validatePatientSerNumAndLanguage(patientSerNumAndLanguageRow)) {
                        // save answer in questionnaire DB
                        return questionnaires.saveAnswer(patientSerNumAndLanguageRow[0], requestObject.Parameters, requestObject.AppVersion, requestObject.UserID);
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
 * @desc Updates the questionnaire status in both the OpalDB and the QuestionnaireDB.
 *       Also notifies the OIE if the questionnaire's new status is completed.
 * @param {object} requestObject
 * @returns {Promise<{Response: string}>} Resolves with a "success" response, or rejects with an error.
 */
async function questionnaireUpdateStatus(requestObject) {
    // Validate the parameters
    if (!questionnaireValidation.validateParamUpdateStatus(requestObject)) {
        const paramErrMessage = "Error updating status: the requestObject does not have the required parameters";
        logger.log("error", paramErrMessage);
        throw new Error(paramErrMessage);
    }

    // 1. update the status in the answerQuestionnaire table in questionnaire DB
    // First, get the patientSerNum in the opal database
    let patientSerNumAndLanguageRow = await OpalSQLQueryRunner.run(
        opalQueries.patientTableFieldsForUser(),
        [requestObject.UserID]
    );

    if (!questionnaireValidation.validatePatientSerNumAndLanguage(patientSerNumAndLanguageRow)) {
        const questionnaireSerNumLanguageErrMessage = "Error updating status: No matching PatientSerNum found in opalDB";
        logger.log("error", questionnaireSerNumLanguageErrMessage);
        throw new Error(questionnaireSerNumLanguageErrMessage);
    }

    const isCompleted = await questionnaires.updateQuestionnaireStatusInQuestionnaireDB(
        requestObject.Parameters.answerQuestionnaire_id,
        requestObject.Parameters.new_status,
        requestObject.UserID,
        requestObject.AppVersion,
    );

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
            logger.log(
                "error",
                `Failed to send notification of completed questionnaire to the OIE: ${JSON.stringify(error)}`
            );
        }
    }

    return {Response: 'success'};
}
