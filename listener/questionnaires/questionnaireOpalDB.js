// SPDX-FileCopyrightText: Copyright 2020 Opal Health Informatics Group at the Research Institute of the McGill University Health Centre <john.kildea@mcgill.ca>
//
// SPDX-License-Identifier: AGPL-3.0-or-later

import ApiRequest from '../../src/core/api-request.js';
import axios from 'axios';
import config from '../config-adaptor.js';
import logger from '../logs/logger.js';
import opalQueries from '../sql/queries.js';
import OpalSQLQueryRunner from '../sql/opal-sql-query-runner.js';
import questionnaireConfig from './questionnaireConfig.json' with { type: "json" };
import QuestionnaireDjango from './questionnaireDjango.js';
import questionnaireQueries from './questionnaireQueries.js';
import questionnaires from './questionnaireQuestionnaireDB.js';
import questionnaireValidation from './questionnaire.validate.js';

/*
FUNCTIONS TO GET QUESTIONNAIRES (QUESTIONNAIRE V2)
 */

/**
 * getQuestionnaireInOpalDB
 * @desc Returns a promise containing the questionnaire's general information stored in OpalDB. Used for the new questionnaire 2019
 * @deprecated Since QSCCD-1559, in released versions after 1.12.2.
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
 * @description Looks up the answerQuestionnaireId corresponding to a given QuestionnaireSerNum.
 * @param questionnaireSerNum The SerNum of the questionnaire to find.
 * @throws {string} Throws an error message if the questionnaire is not found.
 * @returns {Promise<*>} Resolves to the questionnaire's answerQuestionnaireId.
 */
async function getAnswerQuestionnaireIdFromSerNum(questionnaireSerNum) {
    let rows = await OpalSQLQueryRunner.run(questionnaireQueries.getAnswerQuestionnaireIdFromSerNum(), [questionnaireSerNum]);
    if (!rows || rows.length === 0) throw `Questionnaire with QuestionnaireSerNum = ${questionnaireSerNum} not found`;
    return rows[0].answerQuestionnaireId;
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
                const lastUpdated = requestObject.params?.Date ? new Date(Number(requestObject.params.Date)) : 0;
                // get questionnaire list
                return questionnaires.getQuestionnaireList(
                    patientSerNumAndLanguageRow[0],
                    requestObject.UserID,
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
async function getQuestionnaire(requestObject) {
    // check argument
    if (!questionnaireValidation.validatePatientQuestionnaireSerNum(requestObject)) {
        throw new Error('Error getting questionnaire: the requestObject does not have the required parameter qp_ser_num');
    }

    const patientSerNum = Number(requestObject.TargetPatientID);
    let language = await getQuestionnaireLanguage(requestObject);
    // get questionnaire belonging to that qp_ser_num
    let result = await questionnaires.getQuestionnaire(language, requestObject.Parameters.qp_ser_num);
    if (result.status !== questionnaireConfig.COMPLETED_QUESTIONNAIRE_STATUS) {
        //check the caregiver permissions for the user
        await checkCaregiverPermissions(requestObject.UserID, patientSerNum);
        //check the questionnaire locking status
        let respondent = await questionnaires.getRespondentUsername(requestObject.Parameters.qp_ser_num);
        if (respondent[0]['respondentUsername'] && respondent[0]['respondentUsername'] != requestObject.UserID){
            const errMsg = `ERROR: another user has already locked this questionnaire.`;
            throw new Error(errMsg, {cause: '-8'});
        }
    }

    return {
        Data: result,
    };
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

    const patientSerNum = Number(requestObject.TargetPatientID);

    await checkCaregiverPermissions(requestObject.UserID, patientSerNum);

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
        const paramErrMessage = "Error updating status: the requestObject does not have the required parameters";
        logger.log("error", paramErrMessage);
        throw new Error(paramErrMessage);
    }

    const patientSerNum = Number(requestObject.TargetPatientID);

    await checkCaregiverPermissions(requestObject.UserID, patientSerNum);

    // 1. update the status in the answerQuestionnaire table in questionnaire DB
    const isCompleted = await questionnaires.updateQuestionnaireStatusInQuestionnaireDB(
        requestObject.Parameters.answerQuestionnaire_id,
        requestObject.Parameters.new_status,
        requestObject.UserID,
        requestObject.AppVersion,
        requestObject.Parameters.user_display_name || '',
    );

    // Implicitly mark the questionnaire's notification as read once the questionnaire is changed to "in progress".
    // Note that the notification will be marked as read for the self-user and all caregivers.
    const newStatusInt = parseInt(requestObject.Parameters.new_status);
    if (newStatusInt === questionnaireConfig.IN_PROGRESS_QUESTIONNAIRE_STATUS) {
        logger.log('verbose', "Implicitly marking the questionnaire's notification as read.");

        const questionnaire = await OpalSQLQueryRunner.run(
            opalQueries.getOpalDBQuestionnaire(),
            [requestObject.Parameters.answerQuestionnaire_id],
        );

        const requestParams = {
            Parameters: {
                method: 'get',
                url: `/api/patients/legacy/${patientSerNum}/caregiver-devices/`,
                headers: {
                    'Content-Type': 'application/json',
                },
            },
            UserID: requestObject.UserID,
        };

        logger.log('verbose', "API: Calling backend to get the user's list of caregivers.");
        const response = await ApiRequest.makeRequest(requestParams);
        // Silently exit if lister cannot fetch the user's list of caregivers
        if (!response?.data) {
            logger.log('error', "An error occurred while fetching the patient's list of caregivers.");
            return {
                Response: 'success',
                QuestionnaireSerNum: questionnaire[0]['QuestionnaireSerNum'],
            };
        }

        // Update Notification table ReadBy and ReadStatus for each caregiver and the patient
        // Business rule: Notification gets cleared for all users when one of them starts the questionnaire.
        response.data?.caregivers.forEach(async (caregiver) => {
            const username = caregiver['username'];
            try {
                await OpalSQLQueryRunner.run(
                    opalQueries.implicitlyReadNotification(),
                    [
                        username,
                        `"${username}"`, // Double quotes needed only for the JSON_CONTAINS function
                        questionnaire[0]['QuestionnaireSerNum'],
                        patientSerNum,
                        "LegacyQuestionnaire",
                    ],
                );
            } catch (error) {
                console.error("Failed to append username:", username, "Error:", error);
            }
        });


        return {
            Response: 'success',
            QuestionnaireSerNum: questionnaire[0]['QuestionnaireSerNum'],
        };
    }

    if (isCompleted === 1) {

        // 2. update the status in the questionnaire table of the opal DB if completed
        await OpalSQLQueryRunner.run(questionnaireQueries.updateQuestionnaireStatus(), [isCompleted, requestObject.Parameters.answerQuestionnaire_id]);
        // TODO: do we rollback if this fails + insert log into DB

        // 3. If the questionnaire is completed, notify the ORMS directly. If an error occurs, don't cause the whole function to fail.
        try {
            logger.log("info", "Notifying the ORMS that a questionnaire was completed.");
            if (!config.QUESTIONNAIRE_COMPLETED_URL) {
                throw "No value was provided for QUESTIONNAIRE_COMPLETED_URL in the config file.";
            }
            await axios.post(config.QUESTIONNAIRE_COMPLETED_URL);
        }
        catch (error) {
            logger.log("error", `Failed to send notification of completed questionnaire to the ORMS`, error);
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

/**
 * Check if caregiver has permissions to answer questionnaire.
 *
 * @param {string} userId The Firebase username of the user making the request.
 * @param {number} patientSerNum The PatientSerNum of the care-receiver.
 *
 * @throws Throws an error if caregiver does not have permissions to answer the questionnaire.
 */
async function checkCaregiverPermissions(userId, patientSerNum) {
    logger.log('verbose', "Checking if caregiver can answer questionnaire.");

    let canAnswerPatientQuestionnaires = await QuestionnaireDjango.caregiverCanAnswerQuestionnaire(
        userId,
        patientSerNum,
    );

    if (!canAnswerPatientQuestionnaires) {
        const errMsg = `The requested questionnaire cannot be completed by this user.`;
        throw new Error(errMsg, {cause: 'Not allowed'});
    }
}

export default {
    getQuestionnaireInOpalDB,
    getAnswerQuestionnaireIdFromSerNum,
    getQuestionnaireList,
    getQuestionnaire,
    getQuestionnairePurpose,
    questionnaireSaveAnswer,
    questionnaireUpdateStatus,
}
