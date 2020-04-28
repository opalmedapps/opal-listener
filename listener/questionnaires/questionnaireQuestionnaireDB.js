var exports = module.exports = {};
var mysql = require('mysql');
var q = require('q');
var credentials = require('./../config.json');
var utility = require('../utility/utility');
const logger = require('./../logs/logger');

// the following config file stores all of our constants used in the questionnaireDB. Note that we use require here. That means any change made to the JSON inside will be made to the cached version.
// you should not, in any stage of your program, make change to properties inside.
const questionnaireConfig = require('./questionnaireConfig.json');
// queries related to questionnaire
const questionnaireQueries = require('./questionnaireQueries.js');

/*
*Connecting to mysql database
*/
const questionnaireDBCredentials = {
    host: credentials.HOST,
    user: credentials.MYSQL_USERNAME,
    password: credentials.MYSQL_PASSWORD,
    database: credentials.MYSQL_DATABASE_QUESTIONNAIRE,
    dateStrings: true,
    port: credentials.MYSQL_DATABASE_PORT
};

const questionnairePool = mysql.createPool(questionnaireDBCredentials);

function runQuery(query, parameters = null) {
    return new Promise((resolve, reject) => {
        questionnairePool.getConnection(function (err, connection) {
            logger.log('debug', `Grabbed SQL connection: ${connection}`);
            const que = connection.query(query, parameters, function (err, rows) {
                connection.release();
                if (err) {
                    logger.log("error", `Failed to execute query: ${que.sql}`, err);
                    reject(err);
                }
                logger.log('info', `Successfully performed query: ${que.sql}`);
                if (typeof rows !== 'undefined') {
                    resolve(rows);
                } else {
                    resolve([]);
                }
            });
        });
    });
}

/**
 * From this point is the new questionnaire front-end V2: 19-08-2019
 */

exports.getQuestionnaireList = getQuestionnaireList;
exports.getQuestionnaire = getQuestionnaire;
exports.saveAnswer = saveAnswer;
exports.updateQuestionnaireStatusInQuestionnaireDB = updateQuestionnaireStatusInQuestionnaireDB;

/*
FUNCTIONS TO GET QUESTIONNAIRES
 */

/**
 * getQuestionnaireList
 * @desc this function get a list of questionnaire belonging to an user.
 * @param {object} opalPatientSerNumAndLanguage object containing PatientSerNum and Language as property. These information comes from OpalDB
 * @returns {promise}
 */
function getQuestionnaireList(opalPatientSerNumAndLanguage) {
    let r = q.defer();

    // get questionnaire list
    runQuery(questionnaireQueries.getQuestionnaireListQuery(),
        [opalPatientSerNumAndLanguage.PatientSerNum, opalPatientSerNumAndLanguage.Language])
        .then(function (queryResult) {

            if (!hasValidProcedureStatus(queryResult)) {
                r.reject(new Error('Error getting questionnaire list: query error'));
            } else {
                r.resolve(queryResult[0]);
            }
        })
        .catch(function (err) {
            r.reject(err);
        })

    return r.promise;
}

/**
 * getQuestionnaire
 * @desc this function gets data related to that questionnaire, including answers
 * @param {object} opalPatientSerNumAndLanguage object containing PatientSerNum and Language as property. These information comes from OpalDB
 * @param {number} answerQuestionnaire_Id This is the ID of the answerQuestionnaire (questionnaire belonging to that user and which the user would like to view). Should be passed from qplus.
 * @returns {Promise}
 */
function getQuestionnaire(opalPatientSerNumAndLanguage, answerQuestionnaire_Id) {
    let r = q.defer();

    let questionAndTypeMap = {};
    let lang_id;
    let questionnaireDataArray;
    let sectionDataArray;
    let questionDataArray;
    let answerDataArray; // note that this might not contain any useful data if the questionnaire is new
    let answerObject;

    runQuery(questionnaireQueries.getQuestionnaireQuery(), [answerQuestionnaire_Id, opalPatientSerNumAndLanguage.Language])
        .then(function (queryResult) {
            if (!hasValidProcedureStatus(queryResult) ||
                !queryResult[queryResult.length - 2][0].hasOwnProperty('language_id') ||
                !queryResult[queryResult.length - 2][0].language_id) {

                r.reject(new Error('Error getting questionnaire: query error'));
            } else {
                lang_id = queryResult[queryResult.length - 2][0].language_id;

                questionnaireDataArray = queryResult[0];
                sectionDataArray = queryResult[1];
                questionDataArray = queryResult[2];
                answerDataArray = queryResult[3];

                questionAndTypeMap = getQuestionAndTypeMap(queryResult[2]);
                answerObject = formatAnswer(questionnaireDataArray, answerDataArray);

                return getQuestionOptions(questionAndTypeMap, lang_id);
            }
        })
        .then(function (questionOptionsAndTypeMap) {

            let dataFormatted = formatQuestionnaire(questionnaireDataArray, sectionDataArray, questionDataArray, answerObject, questionOptionsAndTypeMap);

            r.resolve(dataFormatted);
        })
        .catch(function (err) {
            r.reject(err);
        })

    return r.promise;
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
    validateQuestionnaireProperties(questionnaireDataArray[0]);

    // if new questionnaire, there will be no answers to format
    if (questionnaireDataArray[0].status === questionnaireConfig.NEW_QUESTIONNAIRE_STATUS) {
        return answerObject;
    }

    // if in progress or completed questionnaire, organize the answers
    for (var i = 0; i < answerDataArray.length; i++) {

        let answer = answerDataArray[i];

        // check property for every answer
        validateAnsweredQuestionnaire(answer);

        // this can happen if the user answered the question but did not select an option
        if (answer.answer_value === null) {
            // do not include it in the answer giving to the app because it is an invalid answer.
            continue;
        }

        // initialize the questionSection_id as the key for answerObject
        if (answerObject[answer.questionSection_id] === undefined) {
            answerObject[answer.questionSection_id] = [];
        }
        answerObject[answer.questionSection_id].push(answer);
    }

    return answerObject;
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
    const char_limit_for_textbox = questionnaireConfig.CHAR_LIMIT_FOR_TEXTBOX;     // this is arbitrarily determined, can be changed

    // this function is used for formatting one questionnaire only. This is checked in the procedure getQuestionnaireInfo, but just in case that this function is being called by mistake.
    // verify required properties for the questionnaire data should be done in the calling function
    if (questionnaireDataArray.length !== 1) {
        throw new Error("Error getting questionnaire: there is more than one or no questionnaire associated with the ID provided");
    }

    // decode html
    questionnaireDataArray[0].description = utility.htmlspecialchars_decode(questionnaireDataArray[0].description);
    questionnaireDataArray[0].instruction = utility.htmlspecialchars_decode(questionnaireDataArray[0].instruction);

    let sections = {};

    sectionDataArray.forEach(function (section) {
        // check required properties for a section
        validateSectionProperties(section);

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
            throw new Error("Error getting questionnaire: this questionnaire's question does not belong to a section");
        }

        // get the options for that question
        // if the options are not defined or are not inside an array for that question, raise error
        if (questionOptionsAndTypeMap[question.type_id][question.question_id] === undefined || !Array.isArray(questionOptionsAndTypeMap[question.type_id][question.question_id])) {
            throw new Error("Error getting questionnaire: options do not exist for question");
        }

        let options = questionOptionsAndTypeMap[question.type_id][question.question_id];

        // add character limit for textbox questions
        if (question.type_id === questionnaireConfig.TEXTBOX_TYPE_ID) {
            if (options.length !== 1) {
                throw new Error("Error getting questionnaire: text box question options error");
            }

            options[0].char_limit = char_limit_for_textbox;
        }

        // dealing with answers now
        let patient_answer = {};

        // get the answers for that question if the questionnaire is not new
        if (questionnaireDataArray[0].status === questionnaireConfig.COMPLETED_QUESTIONNAIRE_STATUS) {
            // a question might have duplicates in a single section, but a questionSection_id is unique (reason for why the key is questionSection_id and not question_id)
            // the following check is for when the migration has not migrate the answers
            if (answerObject[question.questionSection_id] === undefined) {
                patient_answer.answer = [];
            } else {
                patient_answer.answer = answerObject[question.questionSection_id];
            }

            patient_answer.is_defined = 1;

        } else if (questionnaireDataArray[0].status === questionnaireConfig.IN_PROGRESS_QUESTIONNAIRE_STATUS) {
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

        // combine the question general information with its answer and options
        let questionObject = Object.assign({}, {options: options, patient_answer: patient_answer}, question);

        sections[question.section_id].questions.push(questionObject);
    });

    // the use of Object.values is because the front-end uses indexes with is based off an array
    let returnedData = Object.assign({}, {sections: Object.values(sections)}, questionnaireDataArray[0]);

    return returnedData;
}

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
        validateQuestionProperties(question);

        // initialize for every type
        if (questionAndTypeMap[question.type_id] === undefined) {
            questionAndTypeMap[question.type_id] = [];
        }

        questionAndTypeMap[question.type_id].push(question.question_id);
    });

    return questionAndTypeMap;
}

/**
 * getQuestionOptions
 * @desc This async function calls a procedure in the questionnaireDB to get all the question options according to the language passed.
 * @param {object} questionAndTypeMap this object should have type_id as key and question_id as value
 * @param {int} languageId this is the id in the questionnaireDB of the language required
 * @returns {Promise} This promise resolves to questionOptionsAndTypeMap which is an object with type_id as keys and the options per questionId gotten from questionnaireDB as values
 *                      questionOptionsAndTypeMap should look like questionOptionsAndTypeMap[type_id][question_id][array of objects which are the options]
 */
function getQuestionOptions(questionAndTypeMap, languageId) {
    let r = q.defer();
    let promiseArray = [];
    let questionOptionsAndTypeMap = {};
    let queryErr = 0;

    Object.keys(questionAndTypeMap).forEach(function (typeId) {
        promiseArray.push(runQuery(questionnaireQueries.getQuestionOptionsQuery(), [typeId, [questionAndTypeMap[typeId].join()], languageId]));
    });

    q.all(promiseArray)
        .then(function (returnedPromiseArray) {
            for (var i = 0; i < returnedPromiseArray.length; i++) {
                let typeQueryResponse = returnedPromiseArray[i];

                if (!hasValidProcedureStatus(typeQueryResponse) || !typeQueryResponse[typeQueryResponse.length - 2][0].hasOwnProperty('type_id')) {
                    queryErr = 1;
                    break;
                }

                // initialize the array.
                // questionOptionsAndTypeMap should look like questionOptionsAndTypeMap[type_id][question_id][array of objects which are the options]
                questionOptionsAndTypeMap[typeQueryResponse[typeQueryResponse.length - 2][0].type_id] = [];

                // check properties for each question options and group them by questionId
                for (var j = 0; j < typeQueryResponse[0].length; j++) {
                    let typeQueryResponseRow = typeQueryResponse[0][j];

                    // verify properties
                    if (!typeQueryResponseRow.hasOwnProperty('questionId') || !typeQueryResponseRow.questionId) {
                        queryErr = 1;
                        i = returnedPromiseArray.length;    // this is used to break from the outer loop
                        break;
                    }

                    // if required properties exist then sort them by question_id
                    if (questionOptionsAndTypeMap[typeQueryResponse[typeQueryResponse.length - 2][0].type_id][typeQueryResponseRow.questionId] === undefined) {
                        questionOptionsAndTypeMap[typeQueryResponse[typeQueryResponse.length - 2][0].type_id][typeQueryResponseRow.questionId] = [];
                    }

                    questionOptionsAndTypeMap[typeQueryResponse[typeQueryResponse.length - 2][0].type_id][typeQueryResponseRow.questionId].push(typeQueryResponseRow);
                }
            }

            if (queryErr === 1) {
                r.reject(new Error('Error getting questionnaire: query for question options error'));
            } else {
                r.resolve(questionOptionsAndTypeMap);
            }
        })
        .catch(function (err) {
            r.reject(err);
        });

    return r.promise;
}

/*
FUNCTIONS TO SAVE QUESTIONNAIRE
 */

/**
 * saveAnswer
 * @desc this saves the answer of one question only
 * @param {object} opalPatientSerNumAndLanguage must contain PatientSerNum and Language as properties. This should be gotten directly from the OpalDB
 * @param {object} param the parameters passed from the front-end. The calling function must verify its properties.
 * @param {String} appVersion a string denoting the version of the app.
 * @returns {Promise}
 */
function saveAnswer(opalPatientSerNumAndLanguage, param, appVersion) {

    let r = q.defer();
    let isoLang = opalPatientSerNumAndLanguage.Language;
    let answerId;

    /*
    author of update should be patientId(in questionnaireDB) + '_APP_' + appVersion

    1. get patientId and questionnaireId from answerQuestionnaire_id
    2. update status from new to in progress using answerQuestionnaire_id
    3. verify if the answerSection exist for that answerQuestionnaire_id
        3.1 if it exist take that ID as answerSectionId
            and verify if the answer exists for that ID
                3.1.1 if it exists, mark it as deleted, go to 4.
                3.1.2 if it does not exist, go to 4.
        3.2 if it does not exist, create one, and take the insertId as answerSectionId
    4. use answerSectionId from 3. and section_id, question_id, is_skipped, question_type_id from the param, questionnaireId from 1., and language from the opal db to insert into the answer table
    5. using the insertId from 4. and using answer array and question_type_id from param, insert into the sub-answer tables
     */

    runQuery(questionnaireQueries.saveAnswerQuery(),
        [param.answerQuestionnaire_id, param.section_id, param.question_id, param.question_type_id, param.is_skipped, appVersion, isoLang])
        .then(function (queryResult) {
            if (!hasValidProcedureStatus(queryResult) || !queryResult[queryResult.length - 2][0].hasOwnProperty('inserted_answer_id')) {
                r.reject(new Error('Error saving answer: query unsuccessful'));
            } else {
                answerId = queryResult[queryResult.length - 2][0].inserted_answer_id;

                // TODO: this does not cover the case of skipped answer, but since skipped is not implemented yet, it's fine

                if (!param.hasOwnProperty('answer') || !Array.isArray(param.answer)) {
                    // this happens if the user has given an answer but has not chosen an option. It should only happen for checkbox type.
                    r.resolve('AnswerId: ' + answerId + '. The answer is not submitted in sub table. ');
                } else {
                    // 5. using the insertId from 4. and using answer array and question_type_id from param, insert into the sub-answer tables
                    // parseInt is used here just in case that the front end sent a string
                    return insertAnswerByType(answerId, param.answer, parseInt(param.question_type_id));
                }
            }
        })
        .then(function (insertAnswerResult) {
            r.resolve('AnswerId: ' + answerId + '. Insert answer by type: ' + insertAnswerResult);
        })
        .catch(function (err) {
            r.reject(err);
        });

    return r.promise;
}

/**
 * insertAnswerByType
 * @desc this is a helper function which insert answers to specific table in the DB depending on the question type.
 * @param {int} answerId this is the ID of the answer inserted for that question in the answer table.
 * @param {array} answerArray this is the array of objects passed from the front-end. We check the property for them. A common property is answer_value.
 * @param {int} question_typeId this denotes the type of the question
 * @returns {Promise}
 */
function insertAnswerByType(answerId, answerArray, question_typeId) {
    let r = q.defer();
    let promiseArray = [];  // this should contain only one query. It is used to avoid r.reject not doing a break.

    // two variables for checkbox and label types
    let isErr = 0;
    let insert_array_string = "";

    switch (question_typeId) {
        case questionnaireConfig.CHECKBOX_TYPE_ID:
            let insert_value_string = "(?,?)";
            let insert_param_array = [];

            // this is for inserting multiple values into the DB using one insert query, to avoid unnecessary network time
            /*
            for 3 answers, i.e. answerArray.length = 3:

            insertAnswerCheckbox should look like this at the end of the loop
            INSERT INTO answerCheckbox (answerId, value) VALUES

            insert_array_string should look like this at the end of the loop
            (?,?),
            (?,?),
            (?,?)
            ;

            insert_param_array should look like this at the end of the loop
            [answerId, answerArray[0].answer_value, answerId, answerArray[1].answer_value, answerId, answerArray[2].answer_value]
             */
            for (var i = 0; i < answerArray.length; i++) {
                if (!answerArray[i].hasOwnProperty('answer_value')) {
                    isErr = 1;
                } else if (isNaN(parseInt(answerArray[i].answer_value))) {
                    // check the validity of the answer: If the first character cannot be converted to a number, parseInt() returns NaN
                    // it should not happen since the answer value should be the ID of the option
                    // TODO: error handling -> insert log into DB
                } else {
                    // if this is not the last value inserted, then add a comma
                    if (i !== answerArray.length - 1) {
                        insert_array_string = insert_array_string + insert_value_string + ", ";
                    } else {
                        // if this is the last value, add a semi-colon
                        insert_array_string = insert_array_string + insert_value_string + ";";
                    }
                    insert_param_array.push(answerId);
                    insert_param_array.push(answerArray[i].answer_value);
                }
            }

            if (isErr !== 0) {
                r.reject(new Error('Error saving answer: no required properties in answer array'));
            } else {
                let query = questionnaireQueries.insertAnswerCheckbox() + insert_array_string;
                promiseArray.push(runQuery(query, insert_param_array));
            }
            break;

        case questionnaireConfig.SLIDER_TYPE_ID:
            if (answerArray.length !== 1 || !answerArray[0].hasOwnProperty('answer_value')) {
                r.reject(new Error('Error saving answer: answer array does not have the correct length or no property answer_value in answer array'));
            } else if (isNaN(parseFloat(answerArray[0].answer_value))) {
                // it should not happen since the answer value should be a float
                // TODO: error handling -> insert log into DB
            } else {
                promiseArray.push(runQuery(questionnaireQueries.insertAnswerSlider(), [answerId, answerArray[0].answer_value]));
            }
            break;

        case questionnaireConfig.TEXTBOX_TYPE_ID:
            if (answerArray.length !== 1 || !answerArray[0].hasOwnProperty('answer_value')) {
                r.reject(new Error('Error saving answer: answer array does not have the correct length or no property answer_value in answer array'));
            } else {
                promiseArray.push(runQuery(questionnaireQueries.insertAnswerTextbox(), [answerId, answerArray[0].answer_value]));
            }
            break;

        case questionnaireConfig.RADIOBUTTON_TYPE_ID:
            if (answerArray.length !== 1 || !answerArray[0].hasOwnProperty('answer_value')) {
                r.reject(new Error('Error saving answer: answer array does not have the correct length or no property answer_value in answer array'));
            } else if (isNaN(parseInt(answerArray[0].answer_value))) {
                // it should not happen since the answer value should be a bigint = ID of radio button option
                // TODO: error handling -> insert log into DB
            } else {
                promiseArray.push(runQuery(questionnaireQueries.insertAnswerRadioButton(), [answerId, answerArray[0].answer_value]));
            }
            break;

        case questionnaireConfig.LABEL_TYPE_ID:

            for (var i = 0; i < answerArray.length; i++) {
                if (!answerArray[i].hasOwnProperty('answer_value') || !answerArray[i].hasOwnProperty('selected') || !answerArray[i].hasOwnProperty('posX') ||
                    !answerArray[i].hasOwnProperty('posY') || !answerArray[i].hasOwnProperty('intensity')) {
                    // this is a flag for outside the for loop due to r.reject does not stop the execution of the code
                    isErr = 1;
                    break;

                } else if (isNaN(parseInt(answerArray[i].answer_value)) || isNaN(parseInt(answerArray[i].posY)) ||
                    isNaN(parseInt(answerArray[i].posX)) || isNaN(parseInt(answerArray[i].intensity)) ||
                    isNaN(parseInt(answerArray[i].selected))) {
                    // should not happen
                    // TODO: error handling -> insert log into DB
                } else {
                    // this is the string for inserted value. It should look like this at the end of the loop:
                    /*
                    INSERT INTO answerLabel(answerId, selected, posX, posY, intensity, value)
                    VALUES
                    (answerId, selected, posX, posY, intensity, answer_value),
                    (answerId, selected, posX, posY, intensity, answer_value),
                    (answerId, selected, posX, posY, intensity, answer_value)

                     */
                    // this is to avoid unnecessary network transaction when calling the DB
                    let value_string = "(" + answerId + ", " + answerArray[i].selected + ", " + answerArray[i].posX + ", " +
                        answerArray[i].posY + ", " + answerArray[i].intensity + ", " + answerArray[i].answer_value + ")";

                    // add comma if this is not the last inserted value
                    if (i !== answerArray.length - 1) {
                        value_string = value_string + ",";
                    } else {
                        // if this is the last one, add a semi-colon
                        value_string = value_string + ";";
                    }
                    insert_array_string = insert_array_string + value_string;
                }
            }

            if (isErr === 0) {
                let query = questionnaireQueries.insertAnswerLabel() + insert_array_string;
                promiseArray.push(runQuery(query, []));
            } else {
                r.reject(new Error('Error saving answer: no required properties in answer array'));
            }
            break;

        case questionnaireConfig.TIME_TYPE_ID:
            if (answerArray.length !== 1 || !answerArray[0].hasOwnProperty('answer_value')) {
                r.reject(new Error('Error saving answer: answer array does not have the correct length or no property answer_value in answer array'));
            } else {
                promiseArray.push(runQuery(questionnaireQueries.insertAnswerTime(), [answerId, answerArray[0].answer_value]));
            }
            break;
        case questionnaireConfig.DATE_TYPE_ID:
            if (answerArray.length !== 1 || !answerArray[0].hasOwnProperty('answer_value')) {
                r.reject(new Error('Error saving answer: answer array does not have the correct length or no property answer_value in answer array'));
            } else {
                promiseArray.push(runQuery(questionnaireQueries.insertAnswerDate(), [answerId, answerArray[0].answer_value]));
            }
            break;
        default:
            r.reject(new Error('Error saving answer: do not have an answer table matching the question type. The answerId in answer table is: ' + answerId));
    }

    q.all(promiseArray)
        .then(function (queryResult) {
            r.resolve(queryResult);

        }).catch(function (err) {
        r.reject(err);
    });

    return r.promise;
}

/**
 * updateQuestionnaireStatusInQuestionnaireDB
 * @desc This function is exported and is used to update the questionnaire status in the questionnaireDB
 * @param {number} answerQuestionnaireId The unique Id of the answerQuestionnaire table
 * @param {String} newStatus denote the status to be updated to. It should match the database convention of being either 0,1,2
 * @param {String} appVersion a string denoting the version of the app. This is used for noting the author of update
 * @returns {Promise} resolve with a boolean denoting whether the questionnaire's new status is completed or not
 */
function updateQuestionnaireStatusInQuestionnaireDB(answerQuestionnaireId, newStatus, appVersion) {
    let r = q.defer();

    let isCompleted = 0;
    let newStatusInt = parseInt(newStatus);

    // preprocess arguments passed
    if (newStatusInt === questionnaireConfig.COMPLETED_QUESTIONNAIRE_STATUS) {
        isCompleted = 1;
    } else if (newStatusInt !== questionnaireConfig.IN_PROGRESS_QUESTIONNAIRE_STATUS && newStatusInt !== questionnaireConfig.NEW_QUESTIONNAIRE_STATUS) {
        throw new Error("Error updating the questionnaire status: the new status is not in progress, completed, or new");
    }

    runQuery(questionnaireQueries.updateAnswerQuestionnaireStatus(), [answerQuestionnaireId, newStatus, appVersion])
        .then(function (queryResult) {

            if (!hasValidProcedureStatus(queryResult)) {
                r.reject(new Error('Error updating the questionnaire status: query unsuccessful'));
            } else {
                r.resolve(isCompleted);
            }

        }).catch(function (err) {
        r.reject(err);
    });

    return r.promise;
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