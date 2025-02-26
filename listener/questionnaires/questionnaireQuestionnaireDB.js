var mysql = require('mysql');
var q = require('q');
var credentials = require('./../config-adaptor');
const logger = require('./../logs/logger');
const questionnaireConfig = require('./questionnaireConfig.json');
const questionnaireQueries = require('./questionnaireQueries.js');
const questionnaireValidation = require('./questionnaire.validate');
const format = require('./questionnaireFormatting');

/*
*Connecting to mysql database
*/
const questionnaireDBCredentials = {
    host: credentials.MYSQL_DATABASE_HOST,
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
exports.getQuestionnairePurpose= getQuestionnairePurpose;
exports.getQuestionnaireUnreadNumber = getQuestionnaireUnreadNumber;
exports.saveAnswer = saveAnswer;
exports.updateQuestionnaireStatusInQuestionnaireDB = updateQuestionnaireStatusInQuestionnaireDB;

/*
FUNCTIONS TO GET QUESTIONNAIRES
 */

/**
 * getQuestionnaireList
 * @desc this function get a list of questionnaire belonging to an user.
 * @param {object} opalPatientSerNumAndLanguage object containing PatientSerNum and Language as property. These information comes from OpalDB
 * @param {string} purpose string indicating the purpose of the questionnaire list requested. The purposes can be found in QUESTIONNAIRE_PURPOSE_ID_MAP of the questionnaireConfig.json file.
 * @param {Date} [lastUpdated] - If provided, only items with 'LastUpdated' after this time are returned.
 * @returns {promise}
 */
async function getQuestionnaireList(opalPatientSerNumAndLanguage, purpose, lastUpdated=0) {
    const params = [
        opalPatientSerNumAndLanguage.PatientSerNum,
        findPurposeId(purpose),
        opalPatientSerNumAndLanguage.Language,
    ]
    let queryResult = await runQuery(questionnaireQueries.getQuestionnaireListQuery(), params);

    if (!questionnaireValidation.hasValidProcedureStatus(queryResult)) {
        throw new Error('Error getting questionnaire list: query error - result does not have a successful procedure status');
    }

    // To limit unnecessary processing, skip the filter if no lastUpdated was provided
    const result = lastUpdated ? queryResult[0].filter(row => new Date(row.last_updated) > lastUpdated) : queryResult[0];
    return result;
}

/**
 * getQuestionnaire
 * @desc this function gets data related to that questionnaire, including answers
 * @param {string} language The language in which to return the questionnaire.
 * @param {number} answerQuestionnaire_Id This is the ID of the answerQuestionnaire (questionnaire belonging to that user and which the user would like to view). Should be passed from qplus.
 * @returns {Promise}
 */
function getQuestionnaire(language, answerQuestionnaire_Id) {
    let r = q.defer();

    let questionAndTypeMap = {};
    let lang_id;
    let questionnaireDataArray;
    let sectionDataArray;
    let questionDataArray;
    let answerDataArray; // note that this might not contain any useful data if the questionnaire is new
    let answerObject;

    runQuery(questionnaireQueries.getQuestionnaireQuery(), [answerQuestionnaire_Id, language])
        .then(function (queryResult) {
            if (!questionnaireValidation.hasValidProcedureStatusAndLang(queryResult)) {

                logger.log("error", "Error getting questionnaire: query error");
                r.reject(new Error('Error getting questionnaire: query error'));
            } else {
                lang_id = queryResult[queryResult.length - 2][0].language_id;

                questionnaireDataArray = queryResult[0];
                sectionDataArray = queryResult[1];
                questionDataArray = queryResult[2];
                answerDataArray = queryResult[3];

                questionAndTypeMap = format.getQuestionAndTypeMap(queryResult[2]);
                answerObject = format.formatAnswer(questionnaireDataArray, answerDataArray);

                return getQuestionOptions(questionAndTypeMap, lang_id);
            }
        })
        .then(function (questionOptionsAndTypeMap) {

            let dataFormatted = format.formatQuestionnaire(questionnaireDataArray, sectionDataArray, questionDataArray, answerObject, questionOptionsAndTypeMap);

            r.resolve(dataFormatted);
        })
        .catch(function (err) {
            logger.log("error", `Error getting questionnaire, ${err}`);
            r.reject(err);
        })

    return r.promise;
}

/**
 * getQuestionnairePurpose
 * @desc this function gets the quetionnaire purpose of a given questionnaire.
 * @param {number} answerQuestionnaireId  The unique Id of the answerQuestionnaire table.
 * @returns {promise}
 */
function getQuestionnairePurpose(answerQuestionnaireId) {
    let r = q.defer();

    runQuery(questionnaireQueries.getQuestionnairePurposeQuery(), [answerQuestionnaireId])
        .then(function (queryResult) {
            if (!questionnaireValidation.validatePurpose(queryResult)) {
                logger.log("error", "Error getting questionnaire purpose: query error");
                r.reject(new Error('Error getting questionnaire purpose: query error'));
            } else {
                r.resolve(queryResult[0]);
            }
        })
        .catch(function (err) {
            logger.log("error", "Error getting questionnaire purpose, " + err);
            r.reject(err);
        })

    return r.promise;
}

/**
 * getQuestionnaireUnreadNumber
 * @desc this function gets the number of unread (e.g. 'New') questionnaires in a given purpose belonging to an user.
 * @param {object} opalPatientSerNum object containing PatientSerNum as a property.
 *                 This information comes from OpalDB
 * @param {string} purpose string indicating the purpose of the questionnaire list requested.
 *                 The purposes can be found in QUESTIONNAIRE_PURPOSE_ID_MAP of the questionnaireConfig.json file.
 * @returns {promise}
 */
function getQuestionnaireUnreadNumber(opalPatientSerNum, purpose) {
    let r = q.defer();

    // get number of unread questionnaires
    runQuery(questionnaireQueries.getNumberUnreadQuery(), [findPurposeId(purpose), opalPatientSerNum.PatientSerNum])
        .then(function (queryResult) {
            if (!questionnaireValidation.validateUnreadNumber(queryResult)) {
                logger.log("error", "Error getting number of unread questionnaires: query error");
                r.reject(new Error('Error getting number of unread questionnaires: query error'));
            } else {
                r.resolve(queryResult[0]);
            }
        })
        .catch(function (err) {
            logger.log("error", "Error getting number of unread questionnaires, " + err);
            r.reject(err);
        })

    return r.promise;
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

    Object.keys(questionAndTypeMap).forEach(function (typeId) {
        promiseArray.push(runQuery(questionnaireQueries.getQuestionOptionsQuery(), [typeId, [questionAndTypeMap[typeId].join()], languageId]));
    });

    q.all(promiseArray)
        .then(function (returnedPromiseArray) {
            for (var i = 0; i < returnedPromiseArray.length; i++) {
                format.formatQuestionOptions(returnedPromiseArray[i], questionOptionsAndTypeMap);
            }
            r.resolve(questionOptionsAndTypeMap);
        })
        .catch(function (err) {
            logger.log("error", `Error getting question options, ${err}`);
            r.reject(err);
        });

    return r.promise;
}

/**
 * findPurposeId
 * @desc helper function to map the purpose string sent from the front-end to its ID in the database
 * @param {string} purposeString
 * @returns {number} The purpose ID in the database
 */
function findPurposeId(purposeString) {
    return questionnaireConfig.QUESTIONNAIRE_PURPOSE_ID_MAP[purposeString.toUpperCase()];
}

/*
FUNCTIONS TO SAVE QUESTIONNAIRE
 */

/**
 * saveAnswer
 * @desc this saves the answer of one question only
 * @param {string} isoLang The language in which the questionnaire was answered.
 * @param {object} param the parameters passed from the front-end. The calling function must verify its properties.
 * @param {string} appVersion a string denoting the version of the app.
 * @param {string} respondentUsername the username of the user answering the questionnaire.
 * @returns {Promise}
 */
function saveAnswer(isoLang, param, appVersion, respondentUsername) {

    let r = q.defer();
    let answerId;

    /*
        author of update should be patientId(in QuestionnaireDB) + '_APP_' + appVersion

        1. get patientId, questionnaireId and respondentUsername from answerQuestionnaire_id
        2. update status from new to in progress using answerQuestionnaire_id (if the questionnaire is not locked by another user) and set the lock to the current user
        3. verify if the answerSection exist for that answerQuestionnaire_id
            3.1 if it exist take that ID as answerSectionId
                and verify if the answer exists for that ID
                    3.1.1 if it exists, mark it as deleted, go to 4.
                    3.1.2 if it does not exist, go to 4.
            3.2 if it does not exist, create one, and take the insertId as answerSectionId
        4. use answerSectionId from 3. and section_id, question_id, is_skipped, question_type_id from the param, questionnaireId from 1., and language from the db to insert into the answer table
        5. using the insertId from 4. and using answer array and question_type_id from param, insert into the sub-answer tables
    */

    runQuery(questionnaireQueries.saveAnswerQuery(),
        [param.answerQuestionnaire_id, param.section_id, param.question_id, param.question_type_id, param.is_skipped, respondentUsername, appVersion, isoLang])
        .then(function (queryResult) {
            if (!questionnaireValidation.hasValidProcedureStatusAndInsertId(queryResult)) {

                logger.log("error", "Error saving answer: query unsuccessful", queryResult);
                let cause = getProcedureCode(queryResult);
                r.reject(new Error('Error saving answer: query unsuccessful', {cause}));
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
            logger.log("error", `Error saving questionnaire answers, ${err}`);
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
            let insert_value_string_checkbox = "(?,?)";
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
                if (!questionnaireValidation.validateCheckboxAnswer(answerArray[i])) {
                    isErr = 1;
                    break;
                } else {
                    // if this is not the last value inserted, then add a comma
                    if (i !== answerArray.length - 1) {
                        insert_array_string = insert_array_string + insert_value_string_checkbox + ", ";
                    } else {
                        // if this is the last value, add a semi-colon
                        insert_array_string = insert_array_string + insert_value_string_checkbox + ";";
                    }
                    insert_param_array.push(answerId);
                    insert_param_array.push(answerArray[i].answer_value);
                }
            }

            if (isErr !== 0) {
                logger.log("error", "Error saving answer: no required properties in answer array");
                r.reject(new Error('Error saving answer: no required properties in answer array'));
            } else {
                let query = questionnaireQueries.insertAnswerCheckbox() + insert_array_string;
                promiseArray.push(runQuery(query, insert_param_array));
            }
            break;

        case questionnaireConfig.SLIDER_TYPE_ID:
            if (!questionnaireValidation.validateSliderAnswer(answerArray)) {
                logger.log("error", "Error saving answer: answer array does not have the correct length, no property answer_value, or incorrect answer_value in answer array");
                r.reject(new Error('Error saving answer: answer array does not have the correct length, no property answer_value, or incorrect answer_value in answer array'));
            } else {
                promiseArray.push(runQuery(questionnaireQueries.insertAnswerSlider(), [answerId, answerArray[0].answer_value]));
            }
            break;

        case questionnaireConfig.TEXTBOX_TYPE_ID:
            if (!questionnaireValidation.validateAnswerArrayLen1(answerArray)) {

                logger.log("error", "Error saving answer: answer array does not have the correct length or no property answer_value");
                r.reject(new Error('Error saving answer: answer array does not have the correct length or no property answer_value in answer array'));
            } else {
                promiseArray.push(runQuery(questionnaireQueries.insertAnswerTextbox(), [answerId, answerArray[0].answer_value]));
            }
            break;

        case questionnaireConfig.RADIOBUTTON_TYPE_ID:
            if (!questionnaireValidation.validateRadioButtonAnswer(answerArray)) {
                logger.log("error", "Error saving answer: answer array does not have the correct length, no property answer_value, or incorrect answer_value in answer array");
                r.reject(new Error('Error saving answer: answer array does not have the correct length, no property answer_value, or incorrect answer_value in answer array'));
            } else {
                promiseArray.push(runQuery(questionnaireQueries.insertAnswerRadioButton(), [answerId, answerArray[0].answer_value]));
            }
            break;

        case questionnaireConfig.LABEL_TYPE_ID:

            let insert_value_string_label = "(?, ?, ?, ?, ?, ?)";

            for (var i = 0; i < answerArray.length; i++) {
                if (!questionnaireValidation.validateLabelAnswer(answerArray[i])) {
                    // this is a flag for outside the for loop due to r.reject does not stop the execution of the code
                    isErr = 1;
                    break;
                }
            }

            if (isErr === 0) {
                // Construct query string, result should be (?, ?, ?, ?, ?, ?),(?, ?, ?, ?, ?, ?)
                let insert_array_string = answerArray.reduce((acc) => [...acc, insert_value_string_label], []).join(',');

                // Create query parameters
                let query_parameters = answerArray.reduce(
                    (acc, answer) => [...acc, answerId, answer.selected, answer.posX, answer.posY, answer.intensity, answer.answer_value] ,[]);

                let query = questionnaireQueries.insertAnswerLabel() + insert_array_string + ';';
                promiseArray.push(runQuery(query, query_parameters));
            } else {
                logger.log("error", "Error saving answer: no required properties in answer array");
                r.reject(new Error('Error saving answer: no required properties in answer array'));
            }
            break;

        case questionnaireConfig.TIME_TYPE_ID:
            if (!questionnaireValidation.validateAnswerArrayLen1(answerArray)) {
                logger.log("error", "Error saving answer: answer array does not have the correct length or no property answer_value in answer array");
                r.reject(new Error('Error saving answer: answer array does not have the correct length or no property answer_value in answer array'));
            } else {
                promiseArray.push(runQuery(questionnaireQueries.insertAnswerTime(), [answerId, answerArray[0].answer_value]));
            }
            break;
        case questionnaireConfig.DATE_TYPE_ID:
            if (!questionnaireValidation.validateAnswerArrayLen1(answerArray)) {
                logger.log("error", "Error saving answer: answer array does not have the correct length or no property answer_value in answer array");
                r.reject(new Error('Error saving answer: answer array does not have the correct length or no property answer_value in answer array'));
            } else {
                promiseArray.push(runQuery(questionnaireQueries.insertAnswerDate(), [answerId, answerArray[0].answer_value]));
            }
            break;
        default:
            logger.log("error", `Error saving answer: do not have an answer table matching the question type. The answerId in answer table is: ${answerId}`);
            r.reject(new Error('Error saving answer: do not have an answer table matching the question type. The answerId in answer table is: ' + answerId));
    }

    q.all(promiseArray)
        .then(function (queryResult) {
            r.resolve(queryResult);

        }).catch(function (err) {
            logger.log("error", "Error saving questionnaire answers, " + err);
            r.reject(err);
        });

    return r.promise;
}

/**
 * updateQuestionnaireStatusInQuestionnaireDB
 * @desc This function is exported and is used to update the questionnaire status in the questionnaireDB
 * @param {number} answerQuestionnaireId The unique Id of the answerQuestionnaire table
 * @param {string} newStatus denote the status to be updated to. It should match the database convention of being either 0,1,2
 * @param {string} respondentUsername the username of the user answering the questionnaire.
 * @param {string} appVersion a string denoting the version of the app. This is used for noting the author of update
 * @param {string} userDisplayName Questionnaire's respondent first and last name used for display purpose.
 * @returns {Promise} resolve with a boolean denoting whether the questionnaire's new status is completed or not
 */
async function updateQuestionnaireStatusInQuestionnaireDB(answerQuestionnaireId, newStatus, respondentUsername, appVersion, userDisplayName) {
    let isCompleted = 0;
    let newStatusInt = parseInt(newStatus);

    // preprocess arguments passed
    if (newStatusInt === questionnaireConfig.COMPLETED_QUESTIONNAIRE_STATUS) {
        isCompleted = 1;
    } else if (newStatusInt !== questionnaireConfig.IN_PROGRESS_QUESTIONNAIRE_STATUS && newStatusInt !== questionnaireConfig.NEW_QUESTIONNAIRE_STATUS) {
        throw new Error("Error updating the questionnaire status: the new status is not in progress, completed, or new");
    }

    try {
        const queryResult = await runQuery(questionnaireQueries.updateAnswerQuestionnaireStatus(), [answerQuestionnaireId, newStatus, respondentUsername, appVersion, userDisplayName]);
        if (!questionnaireValidation.hasValidProcedureStatus(queryResult)) {
            logger.log("error", "Error updating the questionnaire status: query unsuccessful", queryResult);
            let cause = getProcedureCode(queryResult);
            throw new Error('Error updating the questionnaire status: query unsuccessful', {cause});
        } else {
            return isCompleted;
        }
    } catch (error) {
        logger.log("error", `Error updating the questionnaire status`, error);
        throw error;
    }
}

/**
 * @desc Reads the procedure_status returned in a query result, if it exists.
 * @param queryResult The result returned from running a questionnaires procedure in the database.
 * @returns {number|undefined} The procedure_status from the query result, or undefined if it's not found.
 */
function getProcedureCode(queryResult) {
    try {
        return queryResult[0][0].procedure_status;
    }
    catch(error) {
        return undefined;
    }
}
