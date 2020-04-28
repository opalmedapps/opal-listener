var exports = module.exports = {};

const questionnaireQueries = require('./questionnaireQueries.js');
const questionnaires = require('./questionnaireQuestionnaireDB.js');
const sqlInterface = require('./../api/sqlInterface.js');

exports.getQuestionnaireList = getQuestionnaireList;
exports.getQuestionnaire = getQuestionnaire;
exports.questionnaireSaveAnswer = questionnaireSaveAnswer;
exports.questionnaireUpdateStatus = questionnaireUpdateStatus;

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

    return sqlInterface.runSqlQuery(questionnaireQueries.getPatientSerNumAndLanguage(), [requestObject.UserID, null, null])
        .then(function (patientSerNumAndLanguageRow) {

            if (validatePatientSerNumAndLanguage(patientSerNumAndLanguageRow)) {
                // get questionnaire list
                return questionnaires.getQuestionnaireList(patientSerNumAndLanguageRow[0]);
            } else {
                throw new Error('Error getting questionnaire list: No matching PatientSerNum or/and Language found in opalDB');
            }
        })
        .then(function (result) {
            let obj = {};
            obj.Data = result;
            return obj;
        })
        .catch(function (error) {
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
        if (!validateParam_qp_ser_num(requestObject)) {
            reject(new Error('Error getting questionnaire: the requestObject does not have the required parameter qp_ser_num'));

        } else {
            // get language in the database
            sqlInterface.runSqlQuery(questionnaireQueries.getPatientSerNumAndLanguage(), [requestObject.UserID, null, null])
                .then(function (patientSerNumAndLanguageRow) {

                    if (validatePatientSerNumAndLanguage(patientSerNumAndLanguageRow)) {
                        // get questionnaire belonging to that qp_ser_num
                        return questionnaires.getQuestionnaire(patientSerNumAndLanguageRow[0], requestObject.Parameters.qp_ser_num);
                    } else {
                        reject(new Error('Error getting questionnaire: No matching PatientSerNum or/and Language found in opalDB'));
                    }
                })
                .then(function (result) {
                    let obj = {};
                    obj.Data = result;
                    resolve(obj);
                })
                .catch(function (error) {
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
        if (!validateParamSaveAnswer(requestObject)) {

            reject(new Error('Error saving answer: the requestObject does not have the required parameters'));

        } else {
            // get language in the opal database
            sqlInterface.runSqlQuery(questionnaireQueries.getPatientSerNumAndLanguage(), [requestObject.UserID, null, null])
                .then(function (patientSerNumAndLanguageRow) {

                    if (validatePatientSerNumAndLanguage(patientSerNumAndLanguageRow)) {
                        // save answer in questionnaire DB
                        return questionnaires.saveAnswer(patientSerNumAndLanguageRow[0], requestObject.Parameters, requestObject.AppVersion);
                    } else {
                        reject(new Error('Error saving questionnaire: No matching PatientSerNum or/and Language found in opalDB'));
                    }

                })
                .then(function () {
                    // no need to update opalDB questionnaire status since it is not completed.
                    resolve({Response: 'success'});

                })
                .catch(function (error) {
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
        if (!validateParamUpdateStatus(requestObject)) {
            reject(new Error('Error updating status: the requestObject does not have the required parameters'));

        } else {
            let patientSerNumOpalDB;

            // 1. update the status in the answerQuestionnaire table in questionnaire DB
            // get patientSerNum in the opal database
            sqlInterface.runSqlQuery(questionnaireQueries.getPatientSerNumAndLanguage(), [requestObject.UserID, null, null])
                .then(function (patientSerNumAndLanguageRow) {
                    // check returns
                    if (!validatePatientSerNumAndLanguage(patientSerNumAndLanguageRow)) {
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
                    reject(err);
                });
        }
    });
}

/*
FUNCTIONS FOR VALIDATION (QUESTIONNAIRE V2)
 */

/**
 * @name validateParam_qp_ser_num
 * @desc validating the parameter qp_ser_num sent from the front-end
 * @param {object} requestObject object sent from the front-end
 * @returns {boolean} true if the qp_ser_num parameter exists and is in correct format, false otherwise
 */
function validateParam_qp_ser_num(requestObject) {
    return (requestObject.hasOwnProperty('Parameters') && requestObject.Parameters.hasOwnProperty('qp_ser_num')
        && requestObject.Parameters.qp_ser_num !== null && !isNaN(requestObject.Parameters.qp_ser_num));
}

/**
 * @name validatePatientSerNumAndLanguage
 * @desc validate the whether there is a patientSerNum and language returned from the OpalDB
 * @param {array} queryResponse The response directly from the OpalDB
 * @returns {boolean} true if the response is valid, false otherwise
 */
function validatePatientSerNumAndLanguage(queryResponse) {
    return (queryResponse.length === 1
        && queryResponse[0].hasOwnProperty('PatientSerNum')
        && queryResponse[0].hasOwnProperty('Language')
        && queryResponse[0].PatientSerNum !== undefined
        && queryResponse[0].PatientSerNum !== null
        && queryResponse[0].Language !== undefined
        && queryResponse[0].Language !== null);
}

/**
 * @name validateParamSaveAnswer
 * @desc validation function for saving answer.
 * @param {object} requestObject
 * @returns {boolean} true if the requestObject contain the requested properties with the correct format, false otherwise
 */
function validateParamSaveAnswer(requestObject) {
    return (requestObject.hasOwnProperty('Parameters') && requestObject.Parameters.hasOwnProperty('answerQuestionnaire_id') &&
        requestObject.Parameters.hasOwnProperty('is_skipped') && requestObject.Parameters.hasOwnProperty('questionSection_id') &&
        requestObject.Parameters.hasOwnProperty('question_id') && requestObject.Parameters.hasOwnProperty('section_id') &&
        requestObject.Parameters.hasOwnProperty('question_type_id') && !isNaN(requestObject.Parameters.answerQuestionnaire_id) &&
        !isNaN(requestObject.Parameters.questionSection_id) && !isNaN(requestObject.Parameters.question_id) &&
        !isNaN(requestObject.Parameters.section_id) && !isNaN(requestObject.Parameters.question_type_id) &&
        !isNaN(requestObject.Parameters.is_skipped));
}

/**
 * @name validateParamUpdateStatus
 * @desc validation function for updating status
 * @param {object} requestObject
 * @returns {boolean} true if the requestObject contain the requested properties with the correct format, false otherwise
 */
function validateParamUpdateStatus(requestObject) {
    return (
        requestObject.hasOwnProperty('Parameters') && requestObject.Parameters.hasOwnProperty('answerQuestionnaire_id') &&
        requestObject.Parameters.hasOwnProperty('new_status') && !isNaN(parseInt(requestObject.Parameters.new_status)) &&
        !isNaN(parseInt(requestObject.Parameters.answerQuestionnaire_id))
    );
}