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

    return OpalSQLQueryRunner.run(opalQueries.patientTableFieldsForUser(), [requestObject.UserID])
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
async function getQuestionnaire(requestObject) {
    // check argument
    if (!questionnaireValidation.validatingPatientQuestionnaireSerNum(requestObject)) {
        throw new Error('Error getting questionnaire: the requestObject does not have the required parameter qp_ser_num');
    }
    let language = await getQuestionnaireLanguage(requestObject);

    // get questionnaire belonging to that qp_ser_num
    return {
        Data: await questionnaires.getQuestionnaire(language, requestObject.Parameters.qp_ser_num),
    };
}

/*
FUNCTIONS TO SAVE ANSWERS (QUESTIONNAIRE V2)
 */
/**
 * @name questionnaireSaveAnswer
 * @desc Saves the answer to one question in the database.
 * @param {object} requestObject The request object.
 * @returns {Promise} Resolves to an object containing a 'success' response or rejects with an error.
 */
async function questionnaireSaveAnswer(requestObject) {
    // check argument
    if (!questionnaireValidation.validateParamSaveAnswer(requestObject)) {
        throw new Error('Error saving answer: the requestObject does not have the required parameters');
    }
    let language = await getQuestionnaireLanguage(requestObject);

    await questionnaires.saveAnswer(language, requestObject.Parameters, requestObject.AppVersion, requestObject.UserID);
    return {Response: 'success'};
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
    const isCompleted = await questionnaires.updateQuestionnaireStatusInQuestionnaireDB(
        requestObject.Parameters.answerQuestionnaire_id,
        requestObject.Parameters.new_status,
        requestObject.UserID,
        requestObject.AppVersion,
        requestObject.Parameters.user_display_name || '',
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
            logger.log("error", `Failed to send notification of completed questionnaire to the OIE`, error);
        }
    }

    return {Response: 'success'};
}

/**
 * @desc Gets the questionnaire language from the request object, or if not found, from OpalDB (legacy way).
 * @param requestObject The request object to check for a language parameter.
 * @returns {Promise<string>} Resolves to the questionnaire language or throws an error if not found.
 */
async function getQuestionnaireLanguage(requestObject) {
    try {
        // The second method using a query is deprecated and will eventually be removed
        return requestObject.Parameters?.language
            || (await OpalSQLQueryRunner.run(opalQueries.patientTableFieldsForUser(), [requestObject.UserID]))[0].Language;
    }
    catch (error) {
        logger.log('error', 'Error getting questionnaire language', error);
        throw new Error('No language was provided in the request or found in OpalDB');
    }
}
