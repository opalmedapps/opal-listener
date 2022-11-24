const questionnaireConfig = require('./questionnaireConfig.json');
const logger = require('./../logs/logger');

/**
 * ==============================================
 * Validation for questionnaireOpalDB.js
 * ==============================================
 */

const questionnaireOpalDBValidation = {
    'validatePatientQuestionnaireSerNum': validatePatientQuestionnaireSerNum,
    'validatePatientSerNum': validatePatientSerNum,
    'validatePatientSerNumAndLanguage': validatePatientSerNumAndLanguage,
    'validateParamSaveAnswer': validateParamSaveAnswer,
    'validateParamUpdateStatus': validateParamUpdateStatus,
    'validateQuestionnairePurpose': validateQuestionnairePurpose,
    'validateQuestionnaireSerNum': validateQuestionnaireSerNum,
};

/**
 * @name validatePatientQuestionnaireSerNum
 * @desc validating the parameter qp_ser_num sent from the front-end
 * @param {object} requestObject object sent from the front-end
 * @returns {boolean} true if the qp_ser_num parameter exists and is in correct format, false otherwise
 */
function validatePatientQuestionnaireSerNum(requestObject) {
    return (requestObject.hasOwnProperty('Parameters') && requestObject.Parameters.hasOwnProperty('qp_ser_num')
        && requestObject.Parameters.qp_ser_num !== null && !isNaN(requestObject.Parameters.qp_ser_num));
}

/**
 * @name validatePatientSerNum
 * @desc validate the whether there is a patientSerNum returned from the OpalDB
 * @param {array} queryResponse The response directly from the OpalDB
 * @returns {boolean} true if the response is valid, false otherwise
 */
function validatePatientSerNum(queryResponse) {
    return (queryResponse.length === 1
        && queryResponse[0].hasOwnProperty('PatientSerNum')
        && queryResponse[0].PatientSerNum !== undefined
        && queryResponse[0].PatientSerNum !== null);
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
    let requirements = [
        requestObject.UserID,
        requestObject.hasOwnProperty('Parameters'),
        requestObject.Parameters.hasOwnProperty('answerQuestionnaire_id'),
        requestObject.Parameters.hasOwnProperty('is_skipped'),
        requestObject.Parameters.hasOwnProperty('questionSection_id'),
        requestObject.Parameters.hasOwnProperty('question_id'),
        requestObject.Parameters.hasOwnProperty('section_id'),
        requestObject.Parameters.hasOwnProperty('question_type_id'),
        !isNaN(requestObject.Parameters.answerQuestionnaire_id),
        !isNaN(requestObject.Parameters.questionSection_id),
        !isNaN(requestObject.Parameters.question_id),
        !isNaN(requestObject.Parameters.section_id),
        !isNaN(requestObject.Parameters.question_type_id),
        !isNaN(requestObject.Parameters.is_skipped),
    ];
    return requirements.every(requirement => requirement);
}

/**
 * @name validateParamUpdateStatus
 * @desc validation function for updating status
 * @param {object} requestObject
 * @returns {boolean} true if the requestObject contain the requested properties with the correct format, false otherwise
 */
function validateParamUpdateStatus(requestObject) {
    let requirements = [
        requestObject.UserID,
        requestObject.hasOwnProperty('Parameters'),
        requestObject.Parameters.hasOwnProperty('answerQuestionnaire_id'),
        requestObject.Parameters.hasOwnProperty('new_status'),
        !isNaN(parseInt(requestObject.Parameters.new_status)),
        !isNaN(parseInt(requestObject.Parameters.answerQuestionnaire_id)),
    ];
    return requirements.every(requirement => requirement);
}

/**
 * @name validateQuestionnairePurpose
 * @desc validation function for the questionnaire purpose
 * @param {object} requestObject
 * @returns {boolean} true if the requestObject contain the purpose with the correct format, false otherwise
 */
function validateQuestionnairePurpose(requestObject) {
    return (
        requestObject?.Parameters?.purpose &&
        questionnaireConfig.QUESTIONNAIRE_PURPOSE_ID_MAP.hasOwnProperty(requestObject.Parameters.purpose.toUpperCase())
    );
}

/**
 * @name validateQuestionnaireSerNum
 * @desc validating the parameter questionnaireSerNum sent from the front-end
 * @param {object} requestObject object sent from the front-end
 * @returns {boolean} true if the questionnaireSerNum parameter exists and is in correct format, false otherwise
 */
function validateQuestionnaireSerNum(requestObject) {
    return (requestObject.hasOwnProperty('Parameters') && requestObject.Parameters.hasOwnProperty('questionnaireSerNum')
        && !isNaN(requestObject.Parameters.questionnaireSerNum) && parseInt(requestObject.Parameters.questionnaireSerNum) !== 0);
}

/**
 * ==============================================
 * Validation for questionnaireQuestionnaireDB.js
 * ==============================================
 */

const questionnaireQuestionnaireDBValidation = {
    'hasValidProcedureStatus': hasValidProcedureStatus,
    'validateAnsweredQuestionnaire': validateAnsweredQuestionnaire,
    'validateQuestionnaireProperties': validateQuestionnaireProperties,
    'validateQuestionProperties': validateQuestionProperties,
    'validateSectionProperties': validateSectionProperties,
    'hasValidProcedureStatusAndLang': hasValidProcedureStatusAndLang,
    'hasValidProcedureStatusAndType': hasValidProcedureStatusAndType,
    'hasValidProcedureStatusAndInsertId': hasValidProcedureStatusAndInsertId,
    'hasQuestionId': hasQuestionId,
    'validateAnswerArrayLen1': validateAnswerArrayLen1,
    'validateLabelAnswer': validateLabelAnswer,
    'validateSliderAnswer': validateSliderAnswer,
    'validateRadioButtonAnswer': validateRadioButtonAnswer,
    'validateCheckboxAnswer': validateCheckboxAnswer,
    'validatePurpose': validatePurpose,
    'validateUnreadNumber': validateUnreadNumber,
}

/**
 * @name hasValidProcedureStatus
 * @desc verify if the routine in the database has executed successfully or not
 * @param {array} queryResult
 * @returns {boolean} true if the routine has executed successfully, false otherwise
 */
function hasValidProcedureStatus(queryResult) {
    // verify that the procedure has completed.
    // if the procedure did not complete, there will not be a property called procedure_status.
    // If there is an error, the error code will be stored in procedure_status
    // the object containing property procedure_status is stored in the second last position in the returned array since the last position is used for OkPacket.

    return queryResult[queryResult.length - 2][0].hasOwnProperty('procedure_status') &&
        queryResult[queryResult.length - 2][0].procedure_status === questionnaireConfig.PROCEDURE_SUCCESS_CODE;
}

/**
 * @name hasValidProcedureStatusAndType
 * @desc verify if the routine in the database has executed successfully or not and whether a type id is returned
 * @param {array} typeQueryResult
 * @returns {boolean} true if the routine has executed successfully with type id returned, false otherwise
 */
function hasValidProcedureStatusAndType(typeQueryResult) {
    return hasValidProcedureStatus(typeQueryResult) &&
        typeQueryResult[typeQueryResult.length - 2][0].hasOwnProperty('type_id') &&
        typeQueryResult[typeQueryResult.length - 2][0].type_id;
}

/**
 * @name hasValidProcedureStatusAndLang
 * @desc verify if the routine in the database has executed successfully or not and whether a language value is returned
 * @param {array} queryResult The result of the query
 * @returns {boolean} true if the routine has executed successfully with language returned, false otherwise
 */
function hasValidProcedureStatusAndLang(queryResult) {
    // the object containing property language is stored in the second last position in the returned array since the last position is used for OkPacket.

    return hasValidProcedureStatus(queryResult) &&
        queryResult[queryResult.length - 2][0].hasOwnProperty('language_id') &&
        queryResult[queryResult.length - 2][0].language_id;
}

/**
 * @name hasValidProcedureStatusAndInsertId
 * @desc verify if the routine in the database has executed successfully or not and whether an insert id called 'inserted_answer_id' is returned
 * @param {array} queryResult The result of the query
 * @returns {boolean} true if the routine has executed successfully with insert id returned, false otherwise
 */
function hasValidProcedureStatusAndInsertId(queryResult) {
    return hasValidProcedureStatus(queryResult) &&
        queryResult[queryResult.length - 2][0].hasOwnProperty('inserted_answer_id') &&
        queryResult[queryResult.length - 2][0].inserted_answer_id;
}

/**
 * @name validateAnsweredQuestionnaire
 * @desc verify that the answer gotten from the database has the required properties. Throw an error if not.
 * @param {object} answer
 */
function validateAnsweredQuestionnaire(answer) {
    if (!answer.hasOwnProperty('answer_id') || !answer.hasOwnProperty('question_id') || !answer.hasOwnProperty('section_id') ||
        !answer.hasOwnProperty('type_id') || !answer.hasOwnProperty('answered') || !answer.hasOwnProperty('skipped') ||
        !answer.hasOwnProperty('created') || !answer.hasOwnProperty('last_updated') || !answer.hasOwnProperty('questionSection_id') ||
        !answer.hasOwnProperty('answer_value') || !answer.hasOwnProperty('intensity') || !answer.hasOwnProperty('posX') ||
        !answer.hasOwnProperty('posY') || !answer.hasOwnProperty('selected') || !answer.hasOwnProperty('questionnairePatientRelSerNum') ||
        !answer.hasOwnProperty('answer_option_text')) {

        logger.log("error", "Error getting questionnaire: this questionnaire's answers do not have the required properties");
        throw new Error("Error getting questionnaire: this questionnaire's answers do not have the required properties");
    }
}

/**
 * @name validateQuestionnaireProperties
 * @desc verify that the questionnaire has the required properties. If not, throw an error
 * @param {object} questionnaire
 */
function validateQuestionnaireProperties(questionnaire) {

    if (!questionnaire.hasOwnProperty('qp_ser_num') ||
        !questionnaire.qp_ser_num ||
        !questionnaire.hasOwnProperty('status') ||
        !questionnaire.hasOwnProperty('questionnaire_id') ||
        !questionnaire.hasOwnProperty('nickname') ||
        !questionnaire.nickname ||
        !questionnaire.hasOwnProperty('description') ||
        !questionnaire.hasOwnProperty('logo') ||
        !questionnaire.hasOwnProperty('instruction') ||
        !questionnaire.hasOwnProperty('purpose_id') ||
        isNaN(parseInt(questionnaire.purpose_id))) {

        logger.log("error", "Error: this questionnaire does not have the required properties");

        throw new Error("Error: this questionnaire does not have the required properties");
    }
}

/**
 * @name validateQuestionProperties
 * @desc verify if the question has the required properties. If not, the function will throw an error.
 * @param {object} question
 */
function validateQuestionProperties(question) {
    if (!question.hasOwnProperty('section_id') || !question.hasOwnProperty('questionSection_id') || !question.hasOwnProperty('type_id') ||
        !question.hasOwnProperty('question_position') || !question.hasOwnProperty('orientation') || !question.hasOwnProperty('optional') ||
        !question.hasOwnProperty('allow_question_feedback') || !question.hasOwnProperty('polarity') || !question.hasOwnProperty('question_id') ||
        !question.hasOwnProperty('question_text') || !question.question_text ||
        !question.hasOwnProperty('question_display') || !question.question_display) {

        logger.log("error", "Error getting questionnaire: this questionnaire's questions do not have required properties");

        throw new Error("Error getting questionnaire: this questionnaire's questions do not have required properties");
    }
}

/**
 * @name validateSectionProperties
 * @desc verify if the section has the required properties. If not, the function will throw an error.
 * @param {object} section
 */
function validateSectionProperties(section) {
    if (!section.hasOwnProperty('section_id') || !section.hasOwnProperty('section_position') ||
        !section.hasOwnProperty('section_title') || !section.hasOwnProperty('section_instruction')) {

        logger.log("error", "Error getting questionnaire: this questionnaire's sections do not have required properties");
        throw new Error("Error getting questionnaire: this questionnaire's sections do not have required property");
    }
}

/**
 * @name hasQuestionId
 * @desc test if the object has the property questionId
 * @param {object} obj
 * @returns {boolean} True if it has the property, false otherwise
 */
function hasQuestionId(obj) {
    return obj.hasOwnProperty('questionId') && obj.questionId
}

/**
 * @name validateAnswerArrayLen1
 * @desc validate the answer array of length 1, i.e. for question types slider, textbox, date, time, and radio button
 * @param {array} answerArray
 * @returns {boolean} True if the answer array has appropriate length and property, false otherwise
 */
function validateAnswerArrayLen1(answerArray) {
    return answerArray.length === 1 && answerArray[0].hasOwnProperty('answer_value');
}

/**
 * validateLabelAnswer
 * @desc validate all the properties an answer to a label type question should have and their types
 * @param {object} answer
 * @returns {boolean} true if the answer has all required properties and correct types, false otherwise
 */
function validateLabelAnswer(answer) {
    return answer.hasOwnProperty('answer_value') && answer.hasOwnProperty('selected') &&
        answer.hasOwnProperty('posX') && answer.hasOwnProperty('posY') &&
        answer.hasOwnProperty('intensity') && !isNaN(parseInt(answer.answer_value)) &&
        !isNaN(parseInt(answer.posY)) && !isNaN(parseInt(answer.posX)) &&
        !isNaN(parseInt(answer.intensity)) && !isNaN(parseInt(answer.selected));
}

/**
 * validateCheckboxAnswer
 * @desc validate all the properties an answer to a checkbox type question should have and their types
 * @param {object} answer
 * @returns {boolean} true if the answer has all required properties and correct type, false otherwise
 */
function validateCheckboxAnswer(answer) {
    // check the validity of the answer: If the first character cannot be converted to a number, parseInt() returns NaN
    // it should not happen since the answer value should be the ID of the option
    return answer.hasOwnProperty('answer_value') && !isNaN(parseInt(answer.answer_value));
}

/**
 * validateSliderAnswer
 * @desc validate all the properties an answer to a slider type question should have and their types
 * @param {array} answerArray
 * @returns {boolean} true if the answer has required properties and correct type, false otherwise
 */
function validateSliderAnswer(answerArray) {
    return validateAnswerArrayLen1(answerArray) && !isNaN(parseFloat(answerArray[0].answer_value));
}

/**
 * validateRadioButtonAnswer
 * @desc validate all the properties an answer to a radio button type question should have and their types
 * @param {array} answerArray
 * @returns {boolean} true if the answer has required properties and correct type, false otherwise
 */
function validateRadioButtonAnswer(answerArray) {
    return validateAnswerArrayLen1(answerArray) && !isNaN(parseInt(answerArray[0].answer_value));
}

/**
 * validatePurpose
 * @desc verify that the query result has the correct property (purpose)
 * @param {object} queryResult
 * @returns {boolean} true if the result has required property, false otherwise
 */
 function validatePurpose(queryResult) {
    return queryResult[0].hasOwnProperty('purpose') && queryResult[0].purpose;
}

/**
 * validateUnreadNumber
 * @desc verify that the query result has the correct property (numberUnread) and type
 * @param {object} queryResult
 * @returns {boolean} true if the result has required property and correct type, false otherwise
 */
function validateUnreadNumber(queryResult) {
    return queryResult[0].hasOwnProperty('numberUnread') && !isNaN(parseInt(queryResult[0].numberUnread));
}

/**
 * ==============================================
 * Exporting validation functions
 * ==============================================
 */

module.exports = {...questionnaireOpalDBValidation, ...questionnaireQuestionnaireDBValidation};
