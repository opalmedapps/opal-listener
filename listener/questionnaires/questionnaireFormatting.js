const questionnaireValidation = require('./questionnaire.validate');
const questionnaireConfig = require('./questionnaireConfig.json');
var utility = require('../utility/utility');
const QuestionnaireDjango = require('./questionnaireDjango');

exports.getQuestionAndTypeMap = getQuestionAndTypeMap;
exports.formatAnswer = formatAnswer;
exports.formatQuestionOptions = formatQuestionOptions;
exports.formatQuestionnaire = formatQuestionnaire;
exports.filterByRespondent = filterByRespondent;

// Exported for testing
exports.filterPatientQuestionnaires = filterPatientQuestionnaires;
exports.filterCaregiverQuestionnaires = filterCaregiverQuestionnaires;

/**
 * getQuestionAndTypeMap
 * @desc this function takes the array of questions (coming from the questionnaireDB) and sort them into different types.
 *      It is a helper for getting the options for questions
 *      It also verifies the properties of the questionDataArray for the calling function
 * @param {array} questionDataArray
 * @returns {object} questionAndTypeMap This object has type_id as keys, and an array of question_id as value
 */
function getQuestionAndTypeMap(questionDataArray) {
    let questionAndTypeMap = {};

    questionDataArray.forEach(function (question) {
        // check required properties for a question
        questionnaireValidation.validateQuestionProperties(question);

        // initialize for every type
        if (questionAndTypeMap[question.type_id] === undefined) {
            questionAndTypeMap[question.type_id] = [];
        }

        questionAndTypeMap[question.type_id].push(question.question_id);
    });

    return questionAndTypeMap;
}

/**
 * formatAnswer
 * @desc this function is a helper to organize the answers according to the questionSection_id if the questionnaire is not new.
 *       It also check the required properties of questionnaire and answers.
 * @param {array} questionnaireDataArray
 * @param {array} answerDataArray
 * @return {object} answerObject this object has questionSection_id as key, and an array of answers as value
 */
function formatAnswer(questionnaireDataArray, answerDataArray) {
    let answerObject = {};

    // check properties of questionnaireDataArray
    questionnaireValidation.validateQuestionnaireProperties(questionnaireDataArray[0]);

    // if new questionnaire, there will be no answers to format
    if (questionnaireDataArray[0].status === questionnaireConfig.NEW_QUESTIONNAIRE_STATUS) {
        return answerObject;
    }

    // if in progress or completed questionnaire, organize the answers
    answerDataArray.forEach(function (answer) {
        // check property for every answer
        questionnaireValidation.validateAnsweredQuestionnaire(answer);

        // this can happen if the user answered the question but did not select an option
        if (answer.answer_value === null) {
            // do not include it in the answer giving to the app because it is an invalid answer.
            return;     // this means a `continue` if we use normal for loop.
        }

        // initialize the questionSection_id as the key for answerObject
        if (answerObject[answer.questionSection_id] === undefined) {
            answerObject[answer.questionSection_id] = [];
        }
        answerObject[answer.questionSection_id].push(answer);
    })

    return answerObject;
}

/**
 * formatQuestionOptions
 * @desc This function takes the response from a query, validate it, format it and add it to the object questionOptionsAndTypeMap
 * @param {array} typeQueryResponse the response from the query getQuestionOptionsQuery
 * @param {object} questionOptionsAndTypeMap an object with type_id as keys and the options per questionId gotten from questionnaireDB as values
 *                  questionOptionsAndTypeMap should look like questionOptionsAndTypeMap[type_id][question_id][array of objects which are the options]
 */
function formatQuestionOptions(typeQueryResponse, questionOptionsAndTypeMap) {

    if (!questionnaireValidation.hasValidProcedureStatusAndType(typeQueryResponse)) {
        logger.log("error", "Error getting question options: query for question options error");
        throw new Error('Error getting question options: query for question options error');
    }

    // initialize the array.
    // questionOptionsAndTypeMap should look like questionOptionsAndTypeMap[type_id][question_id][array of objects which are the options]
    if (questionOptionsAndTypeMap[typeQueryResponse[typeQueryResponse.length - 2][0].type_id] === undefined ||
        Array.isArray(questionOptionsAndTypeMap[typeQueryResponse[typeQueryResponse.length - 2][0].type_id])) {

        questionOptionsAndTypeMap[typeQueryResponse[typeQueryResponse.length - 2][0].type_id] = [];
    }

    // check properties for each question options and group them by questionId
    for (var j = 0; j < typeQueryResponse[0].length; j++) {
        let typeQueryResponseRow = typeQueryResponse[0][j];

        // verify properties
        if (!questionnaireValidation.hasQuestionId(typeQueryResponseRow)) {

            logger.log("error", "Error getting question options: query for question options error");
            throw new Error('Error getting question options: query for question options error');
        }

        // if required properties exist then sort them by question_id
        if (questionOptionsAndTypeMap[typeQueryResponse[typeQueryResponse.length - 2][0].type_id][typeQueryResponseRow.questionId] === undefined) {
            questionOptionsAndTypeMap[typeQueryResponse[typeQueryResponse.length - 2][0].type_id][typeQueryResponseRow.questionId] = [];
        }

        questionOptionsAndTypeMap[typeQueryResponse[typeQueryResponse.length - 2][0].type_id][typeQueryResponseRow.questionId].push(typeQueryResponseRow);
    }
}

/**
 * formatQuestionnaire
 * @desc this function is a helper function for formatting one questionnaire data gotten from the questionnaireDB to the JSON accepted on the front end. Also decode html.
 * @param {array} questionnaireDataArray
 * @param {array} sectionDataArray
 * @param {array} questionDataArray
 * @param {object} questionOptionsAndTypeMap
 * @param {array} answerObject
 * @return {object} returnedData the fully formatted object to send to front end
 */
function formatQuestionnaire(questionnaireDataArray, sectionDataArray, questionDataArray, answerObject, questionOptionsAndTypeMap) {

    // this function is used for formatting one questionnaire only. This is checked in the procedure getQuestionnaireInfo, but just in case that this function is being called by mistake.
    // verify required properties for the questionnaire data should be done in the calling function
    if (questionnaireDataArray.length !== 1) {
        logger.log("error", "Error getting questionnaire: there is more than one or no questionnaire associated with the ID provided");
        throw new Error("Error getting questionnaire: there is more than one or no questionnaire associated with the ID provided");
    }

    // decode html
    questionnaireDataArray[0].description = utility.htmlspecialchars_decode(questionnaireDataArray[0].description);
    questionnaireDataArray[0].instruction = utility.htmlspecialchars_decode(questionnaireDataArray[0].instruction);
    questionnaireDataArray[0].questionnaire_purpose = findPurposeFromId(questionnaireDataArray[0].purpose_id);

    let sections = {};

    sectionDataArray.forEach(function (section) {
        // check required properties for a section
        questionnaireValidation.validateSectionProperties(section);

        // decode html
        section.section_instruction = utility.htmlspecialchars_decode(section.section_instruction);

        // this is to prevent passing by reference
        sections[section.section_id] = Object.assign({}, {questions: []}, section);
    });

    questionDataArray.forEach(function (question) {
        // required properties should be checked beforehand by the calling function

        // html decoding
        question.question_text = utility.htmlspecialchars_decode(question.question_text);

        // this should not happen. A question should be contained in a section
        if (sections[question.section_id] === undefined) {
            logger.log("error", "Error getting questionnaire: this questionnaire's question does not belong to a section");
            throw new Error("Error getting questionnaire: this questionnaire's question does not belong to a section");
        }

        let options = getOptionForAQuestion(questionOptionsAndTypeMap, question.type_id, question.question_id);

        // add character limit for textbox questions here
        formatTextboxOption(question.type_id, options);

        // dealing with answers now
        let patient_answer = formatPatientAnswer(questionnaireDataArray[0].status, question, answerObject);

        // combine the question general information with its answer and options
        let questionObject = Object.assign({}, {options: options, patient_answer: patient_answer}, question);

        sections[question.section_id].questions.push(questionObject);
    });

    // the use of Object.values is because the front-end uses indexes with is based off an array
    return Object.assign({}, {sections: Object.values(sections)}, questionnaireDataArray[0]);
}

/**
 * getOptionForAQuestion
 * @desc gets the options for a question, if the options are not defined or are not inside an array for that question, raise error
 * @param {object} questionOptionsAndTypeMap an object with type_id as keys and the options per questionId gotten from questionnaireDB as values
 * @param {int} type_id the type Id of the question
 * @param {int} question_id the question Id
 * @returns {array} the array of options for the given question
 */
function getOptionForAQuestion(questionOptionsAndTypeMap, type_id, question_id) {
    // get the options for that question
    // if the options are not defined or are not inside an array for that question, raise error
    if (questionOptionsAndTypeMap[type_id][question_id] === undefined || !Array.isArray(questionOptionsAndTypeMap[type_id][question_id])) {
        logger.log("error", "Error getting questionnaire: options do not exist for question");
        throw new Error("Error getting questionnaire: options do not exist for question");
    }

    return questionOptionsAndTypeMap[type_id][question_id];
}

/**
 * formatTextboxOption
 * @desc verifies the length of a textbox's option and adds character limit for textbox questions into the property char_limit
 *       modifies the original object options
 * @param {int} type_id
 * @param {array} options
 */
function formatTextboxOption(type_id, options) {
    if (type_id === questionnaireConfig.TEXTBOX_TYPE_ID) {
        if (options.length !== 1) {
            logger.log("error", "Error getting questionnaire: text box question options error");
            throw new Error("Error getting questionnaire: text box question options error");
        }

        options[0].char_limit = questionnaireConfig.CHAR_LIMIT_FOR_TEXTBOX;
    }
}

/**
 * formatPatientAnswer
 * @desc formats a question's answer(s) into an object and sets the is_defined flag
 * @param {int} status
 * @param {object} question
 * @param {object} answerObject
 * @returns {{}} patient_answer object containing the answer array and the is_defined flag
 */
function formatPatientAnswer(status, question, answerObject) {
    // dealing with answers now
    let patient_answer = {};

    // get the answers for that question if the questionnaire is not new
    if (status === questionnaireConfig.COMPLETED_QUESTIONNAIRE_STATUS) {
        // a question might have duplicates in a single section, but a questionSection_id is unique (reason for why the key is questionSection_id and not question_id)
        // the following check is for when the migration has not migrate the answers
        if (answerObject[question.questionSection_id] === undefined) {
            patient_answer.answer = [];
        } else {
            patient_answer.answer = answerObject[question.questionSection_id];
        }

        patient_answer.is_defined = 1;

    } else if (status === questionnaireConfig.IN_PROGRESS_QUESTIONNAIRE_STATUS) {
        // a question might have duplicates in a single section, but a questionSection_id is unique (reason for why the key is questionSection_id and not question_id)
        if (answerObject[question.questionSection_id] === undefined) {
            patient_answer.is_defined = 0;
        } else {
            patient_answer.answer = answerObject[question.questionSection_id];
            patient_answer.is_defined = 1;
        }

    } else {
        patient_answer.answer = [];
        patient_answer.is_defined = 0;
    }

    return patient_answer;
}

/**
 * findPurposeFromId
 * @desc find the purpose string from the purpose ID
 * @param {number} purposeId the ID of the purpose in the database
 * @returns {string} the purpose string
 */
function findPurposeFromId(purposeId) {
    for (let purpose in questionnaireConfig.QUESTIONNAIRE_PURPOSE_ID_MAP) {
        if (questionnaireConfig.QUESTIONNAIRE_PURPOSE_ID_MAP[purpose] === purposeId) {
            return purpose;
        }
    }
}

/**
 * @desc Filters a list of questionnaires based on business rules related to their intended respondents.
 *       The resulting list only contains questionnaires that follow the respondent rules for the given user.
 *       See sub-functions for details on each business rule.
 * @param {object[]} list The list of questionnaires to filter.
 * @param {string} userId The Firebase username of the user making the request.
 * @param {number} patientSerNum The PatientSerNum of the patient who is the subject of the questionnaires.
 * @returns {Promise<Object[]>} Resolves to the filtered list of questionnaires, or throws an error if the relationship
 *                              between the caregiver and the patient cannot be found.
 */
async function filterByRespondent(list, userId, patientSerNum) {
    let relationships = await QuestionnaireDjango.getRelationshipsWithPatient(userId, patientSerNum);
    if (relationships.length === 0) throw new Error(`Invalid questionnaire request; could not find a relationship between caregiver '${userId}' and PatientSerNum ${patientSerNum}`);

    let canAnswerPatientQuestionnaires = QuestionnaireDjango.caregiverCanAnswerQuestionnaires(relationships);
    let isSelf = QuestionnaireDjango.caregiverIsSelf(relationships);

    let filteredList = filterPatientQuestionnaires(list, canAnswerPatientQuestionnaires);
    filteredList = filterCaregiverQuestionnaires(filteredList, isSelf);
    return filteredList;
}

/**
 * @desc Filters a list of questionnaires to remove all those that do not comply with the following business rule:
 *           "A user can only view and answer respondent=PATIENT questionnaires when they have a relationship with
 *           the patient that allows answering patient questionnaires."
 *       Questionnaires with a different respondent type are not touched.
 * @param {Object[]} list The list of questionnaires to filter. All questionnaires should be for a single patient.
 * @param canAnswerPatientQuestionnaires A boolean representing whether or not the user can answer patient questionnaires
 *                                       on behalf of the patient.
 * @returns {Object[]} The filtered list of questionnaires (where all respondent=PATIENT questionnaires now fit the business rule).
 */
function filterPatientQuestionnaires(list, canAnswerPatientQuestionnaires) {
    const PATIENT = questionnaireConfig.QUESTIONNAIRE_RESPONDENT_ID.PATIENT;
    return list.filter(questionnaire => {
        // Keep questionnaires that have respondent PATIENT only if the user is allowed to answer patient questionnaires
        return (questionnaire.respondent_id === PATIENT && canAnswerPatientQuestionnaires)
            // For this function, let through all other types of questionnaires
            || questionnaire.respondent_id !== PATIENT
    });
}

/**
 * @desc Filters a list of questionnaires to remove all those that do not comply with the following business rule:
 *           "A user can only view and answer respondent=CAREGIVER questionnaires when they have a relationship with
 *           the patient that is not self."
 *       Questionnaires with a different respondent type are not checked or filtered out.
 * @param {Object[]} list The list of questionnaires to filter. All questionnaires should be for a single patient.
 * @param isSelf A boolean representing whether or not the user is the same person as the patient (is "self").
 * @returns {Object[]} The filtered list of questionnaires (where all respondent=CAREGIVER questionnaires now fit the business rule).
 */
function filterCaregiverQuestionnaires(list, isSelf) {
    const CAREGIVER = questionnaireConfig.QUESTIONNAIRE_RESPONDENT_ID.CAREGIVER;
    return list.filter(questionnaire => {
        // Keep questionnaires that have respondent CAREGIVER only if the user is not the patient (is not "self")
        return (questionnaire.respondent_id === CAREGIVER && !isSelf)
            // For this function, let through all other types of questionnaires
            || questionnaire.respondent_id !== CAREGIVER
    });
}
