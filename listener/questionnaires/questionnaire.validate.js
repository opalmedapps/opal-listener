var exports = module.exports = {};
const {QuestionnaireConfig} = require('./questionnaireConfig.js');

/**
 * ==============================================
 * Validation for questionnaireOpalDB.js
 * ==============================================
 */

exports.validateParam_qp_ser_num = validateParam_qp_ser_num;
exports.validatePatientSerNumAndLanguage = validatePatientSerNumAndLanguage;
exports.validateParamSaveAnswer = validateParamSaveAnswer;
exports.validateParamUpdateStatus = validateParamUpdateStatus;

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
/**
 * ==============================================
 * Validation for questionnaireQuestionnaireDB.js
 * ==============================================
 */

exports.hasValidProcedureStatus = hasValidProcedureStatus;
exports.validateAnsweredQuestionnaire = validateAnsweredQuestionnaire;
exports.validateQuestionnaireProperties = validateQuestionnaireProperties;
exports.validateQuestionProperties = validateQuestionProperties;
exports.validateSectionProperties = validateSectionProperties;

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
        queryResult[queryResult.length - 2][0].procedure_status === QuestionnaireConfig.getQuestionnaireConfig().PROCEDURE_SUCCESS_CODE;
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
        !questionnaire.hasOwnProperty('instruction')) {

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
        throw new Error("Error getting questionnaire: this questionnaire's sections do not have required property");
    }
}