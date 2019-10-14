var exports = module.exports = {};
var mysql = require('mysql');
var q = require('q');
var credentials = require('./../config.json');
const logger = require('./../logs/logger');

// the following config file stores all of our constants used in the questionnaireDB. Note that we use require here. That means any change made to the JSON inside will be made to the cached version.
// you should not, in any stage of your program, make change to properties inside.
const questionnaireConfig = require('./questionnaireConfig.json');

/*var sqlConfig={
  port:'/Applications/MAMP/tmp/mysql/mysql.sock',
  user:'root',
  password:'root',
  database:'QuestionnairesDB',
  dateStrings:true
};
/*
*Connecting to mysql database
*/
var sqlConfig = {
    host: credentials.HOST,
    user: credentials.MYSQL_USERNAME,
    password: credentials.MYSQL_PASSWORD,
    database: credentials.MYSQL_DATABASE_QUESTIONNAIRE,
    dateStrings: true,
    port: credentials.MYSQL_DATABASE_PORT
};
/*
*Re-connecting the sql database, NodeJS has problems and disconnects if inactive,
The handleDisconnect deals with that
*/
var connection = mysql.createConnection(sqlConfig);

function handleDisconnect(myconnection) {
    myconnection.on('error', function (err) {
        //console.log('Re-connecting lost connection');
        connection.destroy();
        connection = mysql.createConnection(sqlConfig);
        handleDisconnect(connection);
        connection.connect();
    });
}

handleDisconnect(connection);

// for questionnaireDB2019:
// query to emulate patientQuestionnaireTableFields in the new Database
var queryPatientQuestionnaireInfo = `CALL queryPatientQuestionnaireInfo(?);`;

/*
legacy query:
Queries to obtain the questions and question choices for questionnaires
var queryQuestions = `SELECT DISTINCT Questionnaire.QuestionnaireSerNum as QuestionnaireDBSerNum,
                        Questionnaire.QuestionnaireName,
                        QC.QuestionnaireName_EN,
                        QC.Intro_EN,
                        QC.QuestionnaireName_FR,
                        QC.Intro_FR,
                        QuestionnaireQuestion.QuestionnaireQuestionSerNum,
                        Question.QuestionSerNum,
                        Question.isPositiveQuestion,
                        Question.QuestionQuestion as QuestionText_EN,
                        Question.QuestionName as Asseses_EN,
                        Question.QuestionName_FR as Asseses_FR,
                        Question.QuestionQuestion_FR as QuestionText_FR,
                        QuestionType.QuestionType,
                        QuestionType.QuestionTypeSerNum,
                        QuestionnaireQuestion.OrderNum
                      FROM Questionnaire,
                        Question,
                        QuestionType,
                        Patient,
                        QuestionnaireQuestion,
                        ` + credentials.MYSQL_DATABASE + `.QuestionnaireControl QC
                      WHERE QuestionnaireQuestion.QuestionnaireSerNum = Questionnaire.QuestionnaireSerNum
                        AND QuestionnaireQuestion.QuestionSerNum = Question.QuestionSerNum
                        AND Question.QuestionTypeSerNum = QuestionType.QuestionTypeSerNum
                        AND QC.QuestionnaireDBSerNum = Questionnaire.QuestionnaireSerNum
                        AND Questionnaire.QuestionnaireSerNum IN ?`;
*/
// for questionnaireDB2019:
// since a section can only be contained in one questionnaire,
// questionSection.ID can be thought as QuestionnaireQuestionSerNum because there is only one per combination of sectionId and questionId
var queryQuestions = `CALL queryQuestions(?);`;

/*
legacy query:
var queryQuestionChoices = "SELECT QuestionSerNum, MCSerNum as OrderNum, MCDescription as ChoiceDescription_EN, MCDescription_FR as ChoiceDescription_FR  FROM QuestionMC WHERE QuestionSerNum IN ? UNION ALL SELECT * FROM QuestionCheckbox WHERE QuestionSerNum IN ? UNION ALL SELECT * FROM QuestionMinMax WHERE QuestionSerNum IN ? ORDER BY QuestionSerNum, OrderNum DESC";
 */
// for questionnaireDB2019:
var queryQuestionChoices = `CALL queryQuestionChoices(?);`;

/*
legacy query:
var queryAnswersPatientQuestionnaire = "SELECT QuestionnaireQuestionSerNum, Answer.Answer, PatientQuestionnaireSerNum as PatientQuestionnaireDBSerNum FROM Answer WHERE PatientQuestionnaireSerNum IN ? ORDER BY PatientQuestionnaireDBSerNum;"
 */
// for questionnaireDB2019:
// note that this query does not take skipped answers into account since these functionnalities do not exist yet in the qplus
var queryAnswers = `CALL queryAnswers(?,?);`;

/**
 * getPatientQuestionnaires
 * @desc the main function for getting the questionnaire information for a patient
 * @param patientIdAndLang: this parameter is obtained form a query for the opalDB
 * @param lang: this is the language passed from the front-end, if the front-end did not send any language parameter, then this should be -1. Pre-processed in the calling function: getQuestionnaires
 * @return {Promise}
 */
exports.getPatientQuestionnaires = function (patientIdAndLang, lang) {
    return new Promise(((resolve, reject) => {

        // check argument
        // if the front-end did not send a language, then we get the language in the opalDB. If that too does not exist, then we default to French
        if (lang === -1){
            if(patientIdAndLang[0].hasOwnProperty('Language') && patientIdAndLang[0].Language !== undefined){
                switch (patientIdAndLang[0].Language) {
                    case ('EN'):
                        lang = 2;
                        break;
                    case ('FR'):
                        lang = 1;
                        break;
                    default:
                        // the default is French
                        lang = 1;
                }
            }else{
                // the default is French
                lang = 1;
            }
        }

        connection.query(queryPatientQuestionnaireInfo, [patientIdAndLang[0].PatientSerNum], function (err, rows, fields) {

            if (rows.length !== 0) {

                let questionnaireDBSerNumArray = getQuestionnaireDBSerNums(rows[0]);

                // the following join in the argument is due to us calling a procedure using CONCAT with a prepared statement,
                // which requires a TEXT argument in the following format: '11,12,23,..'
                connection.query(queryQuestions, [questionnaireDBSerNumArray.join()], function (err, questions, fields) {
                    if (err) reject(err);

                    let questionsOrdered = setQuestionOrder(questions[0]);

                    getQuestionChoices(questionsOrdered).then(function (questionsChoices) {

                        let questionnaires = prepareQuestionnaireObject(questionsChoices, rows[0]);
                        let patientQuestionnaires = {};

                        attachingQuestionnaireAnswers(rows[0], lang).then(function (paQuestionnaires) {
                            patientQuestionnaires = paQuestionnaires;
                            resolve({'Questionnaires': questionnaires, 'PatientQuestionnaires': patientQuestionnaires});
                        }).catch(function (error) {
                            reject(error);
                        });
                    }).catch(function (err) {
                        reject(err);
                    })
                });
            } else {
                resolve([]);
            }
        });
    }));
};

/**
 * prepareQuestionnaireObject
 * @desc Formats questionnaire object to be ready for the app. Did not change anything from the legacy questionnaire
 * @param questionnaires
 * @param opalDB
 * @return {object}
 */
function prepareQuestionnaireObject(questionnaires, opalDB) {
    var questionnairesObject = {};
    for (var i = 0; i < questionnaires.length; i++) {
        var questionnaireSerNum = questionnaires[i].QuestionnaireDBSerNum;
        if (!questionnairesObject.hasOwnProperty(questionnaires[i].QuestionnaireDBSerNum)) {
            questionnairesObject[questionnaires[i].QuestionnaireDBSerNum] = {};
            questionnairesObject[questionnaires[i].QuestionnaireDBSerNum].QuestionnaireDBSerNum = questionnaires[i].QuestionnaireDBSerNum;
            questionnairesObject[questionnaires[i].QuestionnaireDBSerNum].QuestionnaireName = questionnaires[i].QuestionnaireName;
            questionnairesObject[questionnaires[i].QuestionnaireDBSerNum].QuestionnaireName_EN = questionnaires[i].QuestionnaireName_EN;
            questionnairesObject[questionnaires[i].QuestionnaireDBSerNum].Intro_EN = questionnaires[i].Intro_EN;
            questionnairesObject[questionnaires[i].QuestionnaireDBSerNum].QuestionnaireName_FR = questionnaires[i].QuestionnaireName_FR;
            questionnairesObject[questionnaires[i].QuestionnaireDBSerNum].Intro_FR = questionnaires[i].Intro_FR;
            questionnairesObject[questionnaires[i].QuestionnaireDBSerNum].QuestionnaireSerNum = questionnaires[i].QuestionnaireSerNum;
            delete questionnaires[i].QuestionnaireName;
            delete questionnaires[i].QuestionnaireName_EN;
            delete questionnaires[i].Intro_EN;
            delete questionnaires[i].QuestionnaireName_FR;
            delete questionnaires[i].Intro_FR;
            delete questionnaires[i].QuestionnaireDBSerNum;
            questionnairesObject[questionnaireSerNum].Questions = {};
            questionnairesObject[questionnaireSerNum].Questions[questionnaires[i].QuestionnaireQuestionSerNum] = questionnaires[i];
        } else {
            delete questionnaires[i].QuestionnaireName;
            delete questionnaires[i].QuestionnaireDBSerNum;
            questionnairesObject[questionnaireSerNum].Questions[questionnaires[i].QuestionnaireQuestionSerNum] = questionnaires[i];
        }
    }

    return questionnairesObject;
}


/**
 * setQuestionOrder
 * @desc form section order and questions' order inside that section, transform the data into a single ordering of questions.
 *       This is necessary because the legacy questionnaire do not have sections
 * @param questions {array} array of objects
 * @return {array}
 */
function setQuestionOrder(questions) {

    var numberOfQuestionsInPrevSections = {};
    var currSecOrder = 0;
    var thereIsMoreSec = 1;

    while (thereIsMoreSec) {

        thereIsMoreSec = 0;

        var numberOfQuestionsInThisSection = {};

        for (var i = 0; i < questions.length; i++) {

            // set up numberOfQuestionsInThisSection and numberOfQuestionsInPrevSections
            // one entry in numberOfQuestionsInThisSection and numberOfQuestionsInPrevSections for one questionnaire
            if (!numberOfQuestionsInThisSection.hasOwnProperty(questions[i].QuestionnaireDBSerNum)) {
                numberOfQuestionsInThisSection[questions[i].QuestionnaireDBSerNum] = 0;
            }

            if (!numberOfQuestionsInPrevSections.hasOwnProperty(questions[i].QuestionnaireDBSerNum)) {
                numberOfQuestionsInPrevSections[questions[i].QuestionnaireDBSerNum] = 0;
            }

            // if this question has already the right orderNum then skip this question
            if (questions[i].hasOwnProperty('OrderNum')) {
                continue;
            }

            // if this question is in the current section level,
            // then we adjust its orderNum according to (how many questions are there in the previous sections + what is its order in the current section)
            if (questions[i].secOrder === currSecOrder) {

                questions[i].OrderNum = questions[i].qOrder + numberOfQuestionsInPrevSections[questions[i].QuestionnaireDBSerNum];

                // there is one more question dealt with in this section level for this questionnaire
                numberOfQuestionsInThisSection[questions[i].QuestionnaireDBSerNum]++;

            } else if (questions[i].secOrder > currSecOrder) {
                // this question belongs to sections after the current section level, need another loop

                thereIsMoreSec = 1;
            }
        }

        // increment the section level
        currSecOrder++;

        // this is the end of this section level, we add the number of questions in this section level to the previous total
        for (var k in numberOfQuestionsInThisSection) {

            if (numberOfQuestionsInThisSection.hasOwnProperty(k) && numberOfQuestionsInPrevSections.hasOwnProperty(k)) {
                numberOfQuestionsInPrevSections[k] += numberOfQuestionsInThisSection[k];
            }
        }

    }
    return questions;
}

/**
 * getQuestionnaireDBSerNums
 * @desc Extracts only questionnaireSerNum for query injection
 * @param rows {array}
 * @return {Array}
 */
function getQuestionnaireDBSerNums(rows) {
    var questionnaireDBSerNumArray = [];
    for (var i = 0; i < rows.length; i++){
        questionnaireDBSerNumArray.push(rows[i].QuestionnaireDBSerNum);
    }
    return questionnaireDBSerNumArray;
}

/**
 * getQuestionChoices
 * @desc Gets the choices for questions
 * @param rows {array} ordered questions for that patient's questionnaires
 * @return {promise}
 */
function getQuestionChoices(rows) {
    var r = q.defer();
    var array = [];
    if (rows) {

        for (var i = 0; i < rows.length; i++) {
            array.push(rows[i].QuestionSerNum);
        }

        // the following join in the argument is due to us calling a procedure using CONCAT with a prepared statement,
        // which requires a TEXT argument in the following format: '11,12,23,..'
        connection.query(queryQuestionChoices, [array.join()], function (err, choices, fields) {

            if (err) r.reject(err);

            var questions = attachChoicesToQuestions(rows, choices[0]);

            r.resolve(questions);
        });
    } else {
        r.resolve([]);
    }
    return r.promise;
}

/**
 * attachChoicesToQuestions
 * @desc Helper function to attach choices to particular questions
 * @param questions {array}: ordered questions for that patient's questionnaire
 * @param choices {array}: choices gotten for the questions
 * @return {array}
 */
function attachChoicesToQuestions(questions, choices) {

    for (var i = 0; i < questions.length; i++) {
        for (var j = choices.length - 1; j >= 0; j--) {

            if (questions[i].QuestionSerNum === choices[j].QuestionSerNum) {

                if (!questions[i].hasOwnProperty('Choices')) {
                    questions[i].Choices = [];
                }

                // this is to avoid passing by reference of objects
                var choiceCopy = {};
                choiceCopy = Object.assign(choiceCopy, choices[j]);
                questions[i].Choices.push(choiceCopy);

            }
        }
    }

    return questions;
}

/**
 * attachingQuestionnaireAnswers
 * @desc Attaching answers to answered questionnaires
 * @param questionnairesSentToPatient: The list of questionnaires sent to patients. This info is obtained by calling queryPatientQuestionnaireInfo in the questionnaireDB
 * @param lang: the language that the answers are going to be displayed in case the answers have languageId = -1 in the database. This should be obtained from the front end or the opalDB
 *              and pre-processed in getPatientQuestionnaires or the calling function
 * @return {promise}
 */
function attachingQuestionnaireAnswers(questionnairesSentToPatient, lang) {

    var r = q.defer();

    var patientQuestionnaires = {};
    var questionnaireSerNumArray = [];

    for (var i = 0; i < questionnairesSentToPatient.length; i++) {
        patientQuestionnaires[questionnairesSentToPatient[i].QuestionnaireSerNum] = questionnairesSentToPatient[i];

        if (questionnairesSentToPatient[i].CompletedFlag == 1 || questionnairesSentToPatient[i].CompletedFlag == '1') {
            questionnaireSerNumArray.push(questionnairesSentToPatient[i].QuestionnaireSerNum);
        }
    }
    if (questionnaireSerNumArray.length > 0) {
        var quer = connection.query(queryAnswers, [questionnaireSerNumArray.join(), lang], function (err, rows, fields) {

            if (err) r.reject(err);

            // the following line is due to us calling a stored procedure
            rows = rows[0];

            // inserting the answers according to the questionnaire
            // this is for when a question can have multiple answers
            var answersQuestionnaires = {};

            for (var i = 0; rows && i < rows.length; i++) {
                if(!answersQuestionnaires.hasOwnProperty(rows[i].QuestionnaireSerNum)){
                    answersQuestionnaires[rows[i].QuestionnaireSerNum] = [];
                }

                // the answer will be '' to denote the case where there is no real answer text, since null and undefined makes qplus give an error
                if (!rows[i].hasOwnProperty('Answer') || !rows[i].Answer || rows[i].Answer === undefined || rows[i].Answer === null){

                    rows[i].Answer = '';
                }

                answersQuestionnaires[rows[i].QuestionnaireSerNum].push(rows[i]);
            }

            // putting the answers into patientQuestionnaires object
            for (var i = 0; i < questionnairesSentToPatient.length; i++) {

                if(questionnairesSentToPatient[i].CompletedFlag === 1 || questionnairesSentToPatient[i].CompletedFlag === '1'){

                    patientQuestionnaires[questionnairesSentToPatient[i].QuestionnaireSerNum].Answers = answersQuestionnaires[questionnairesSentToPatient[i].QuestionnaireSerNum];
                }
            }

            r.resolve(patientQuestionnaires);

            });
    } else {
        r.resolve(patientQuestionnaires);
    }
    return r.promise;
}

/**
 * Inserting questionnaire answers
 *
 **/
/*
Legacy queries
var inputAnswersQuery = "INSERT INTO `Answer`(`AnswerSerNum`, `QuestionnaireQuestionSerNum`, `Answer`, `LastUpdated`, `PatientSerNum`, `PatientQuestionnaireSerNum`) VALUES (NULL,?,?,NULL,?,?)";
var patientSerNumQuery = "SELECT PatientSerNum FROM Patient WHERE Patient.PatientId = ?;";
var inputPatientQuestionnaireQuery = "INSERT INTO `PatientQuestionnaire`(`PatientQuestionnaireSerNum`, `PatientSerNum`, `DateTimeAnswered`, `QuestionnaireSerNum`) VALUES (NULL,?,?,?)";
*/

// For questionnaireDB2019
var patientIdInQuestionnaireDBQuery = `SELECT ID FROM patient WHERE externalId = ?;`;
var getQuestionSectionInfoFromQuestionnaireQuestionSerNumQuery = `SELECT qSec.questionId, qSec.sectionId, q.typeId 
FROM question q, (SELECT questionId, sectionId FROM questionSection WHERE ID = ?) qSec
WHERE q.deleted <> 1 AND q.ID = qSec.questionId
;`;
var getPatientIdFromQuestionnaireSerNumQuery = `SELECT patientId
FROM answerQuestionnaire
WHERE ID = ? AND deleted <> 1 AND \`status\` <> 2
;`;
var updateStatusCompletedInAnswerQuestionnaireQuery = `UPDATE \`answerquestionnaire\` SET \`status\`='2', \`lastUpdated\`=?, \`updatedBy\`=? WHERE  \`ID\`=?;`;
var insertSectionIntoAnswerSectionQuery = `REPLACE INTO answersection(answerQuestionnaireId, sectionId) VALUES (?, ?);`;

var insertIntoAnswerQuery = `REPLACE INTO 
answer(questionnaireId, sectionId, questionId, typeId, answerSectionId, languageId, patientId, answered, skipped, creationDate, createdBy, lastUpdated, updatedBy)
VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);
`;
var insertTextBox = `INSERT INTO \`answerTextBox\` (\`answerId\`, \`value\`) VALUES (?, ?)`;
var insertSlider = `INSERT INTO \`answerSlider\` (\`answerId\`, \`value\`) VALUES (?, ?)`;

// Answer Type ID for getAnswerTableOptionID: 1 = Checkbox, 4 = Radiobutton, 5 = Label
var insertRadioButton = `REPLACE INTO answerRadioButton (answerId, \`value\`)
VALUES (?, (SELECT getAnswerTableOptionID(?,?,4)));`;

// Answer Type ID for getAnswerTableOptionID: 1 = Checkbox, 4 = Radiobutton, 5 = Label
var insertCheckbox = `REPLACE INTO answerCheckbox (answerId, \`value\`)
VALUES (?, (SELECT getAnswerTableOptionID(?,?,1)));`;

/**
 * inputQuestionnaireAnswers
 * @desc the main function to input the answers gotten from the front-end
 * @param parameters: the parameters gotten from the front-end, verified in the calling function, i.e. inputQuestionnaireAnswers
 * @param appVersion: the version of the app, required for logging updatedBy and createdBy in the database
 * @param patientSerNum: the patientSerNum in the opalDB found using UserID. Its existence is verified by the calling function, i.e. inputQuestionnaireAnswers
 * @return {promise}
 */
exports.inputQuestionnaireAnswers = function (parameters, appVersion, patientSerNum) {
    var r = q.defer();

    var authorOfUpdate; // patientId_APP_appVersion
    var patientId;

   getPatientIdInQuestionnaireDB(parameters, patientSerNum)
       .then(function(verifiedPatientId){

           patientId = verifiedPatientId;
           authorOfUpdate = patientId + '_APP_' + appVersion;

           // update the status in `answerQuestionnaire` table
           return promisifyQuery(updateStatusCompletedInAnswerQuestionnaireQuery, [parameters.DateCompleted, authorOfUpdate, parameters.QuestionnaireSerNum]);
       }).then(function(){

           // gets the questionId, sectionId and type of question from the questionnaireQuestionSerNum of one answer, also the answerSectionId
            // transform the object parameters.Answers into an array to ensure order
           return inputAnswerSection(parameters.QuestionnaireSerNum, Object.values(parameters.Answers));
       }).then(function(formattedAnswers){

           var promiseArray = [];

           for (var i = 0; i < formattedAnswers.length; i++){

               promiseArray.push(inputAnswer(parameters.QuestionnaireDBSerNum, formattedAnswers[i], parameters.Language, patientId, parameters.DateCompleted, authorOfUpdate));
           }

           return q.all(promiseArray);
       }).then(function(result){

           r.resolve(result);
       }).catch(function(err){
           r.reject(err);
       });

    return r.promise;
};

/**
 * inputAnswerSection
 * @desc inputAnswerSection verifies the format of the answers input
 *      It gets the questionId, sectionId and type of question from the questionnaireQuestionSerNum of one answer
 *      It then put the sectionId into `answerSection` table if an entry does not exist yet for that section
 * @param answerQuestionnaireId: questionnaireSerNum sent from qplus
 * @param answers: {array} answers where each element is an object
 * @return {promise} containing questionId, sectionId, typeId, and answerSectionID
 */
function inputAnswerSection(answerQuestionnaireId, answers){
    var r = q.defer();

    var promiseArray = [];
    var sectionAndAnswerSection = {};
    var sectionArray = [];
    var promiseArray2 =[];

    for (var i = 0; i < answers.length; i++){

        // verify the input
        if (!answers[i].hasOwnProperty('QuestionnaireQuestionSerNum') || answers[i].QuestionnaireQuestionSerNum === undefined
        || !answers[i].hasOwnProperty('QuestionType') || answers[i].QuestionType === undefined
        || !answers[i].hasOwnProperty('Answer')){

            throw new Error('Error inputting questionnaire answers: Answers array do not have required properties');
        }

        // if the input is fine, find out the questionId, sectionId and typeId from answers[i].QuestionnaireQuestionSerNum
        promiseArray.push(promisifyQuery(getQuestionSectionInfoFromQuestionnaireQuestionSerNumQuery, [answers[i].QuestionnaireQuestionSerNum]));
    }

    q.all(promiseArray)
        .then(function(promiseArrayReturned){

            for (var i = 0; i < answers.length; i++){
                // add the questionId, sectionId, typeId found into the object
                answers[i].questionId = promiseArrayReturned[i][0].questionId;
                answers[i].sectionId = promiseArrayReturned[i][0].sectionId;
                answers[i].typeId = promiseArrayReturned[i][0].typeId;

                // add the sectionId into the sectionAndAnswerSection as keys, used for inserting into `answerSection` table
                if (!sectionAndAnswerSection.hasOwnProperty(answers[i].sectionId)){

                    sectionAndAnswerSection[answers[i].sectionId] = 0;  // object is used to ensure distinctiveness of sectionId
                    sectionArray.push(answers[i].sectionId);    // array is used to ensure order
                    promiseArray2.push(promisifyQuery(insertSectionIntoAnswerSectionQuery, [answerQuestionnaireId, answers[i].sectionId]));
                }
            }

            // insert all the sectionId into `answerSection` table
            return q.all(promiseArray2);

        }).then(function(promiseArrayReturned2){

            for (var j = 0; j < sectionArray.length; j++){
                sectionAndAnswerSection[sectionArray[j]] = promiseArrayReturned2[j].insertId;
            }

            for (var i = 0; i < answers.length; i++){
                answers[i].answerSectionId = sectionAndAnswerSection[answers[i].sectionId];
            }

            r.resolve(answers);

        }).catch(function(err){

            r.reject('Error inputting questionnaire answers: ', err);

        });

    return r.promise;
}

/**
 * getPatientIdInQuestionnaireDB
 * @desc getPatientIdInQuestionnaireDB gets the patientId in the QuestionnaireDB from the QuestionnaireSerNum. If parameters contain the property patientId, it also checks if both IDs match
 * @param parameters: the parameters sent from the front-end
 * @param patientSerNum: The serNum obtained from opalDB
 * @return {promise}
 */
function getPatientIdInQuestionnaireDB(parameters, patientSerNum) {
    var r = q.defer();

    var promiseArray = [];
    var hasExternalPatientId = 0;
    var patientId;

    // the existence of parameters.QuestionnaireSerNum was already checked beforehand in inputQuestionnaireAnswers
    promiseArray.push(promisifyQuery(getPatientIdFromQuestionnaireSerNumQuery, [parameters.QuestionnaireSerNum]));

    if (patientSerNum !== undefined){
        hasExternalPatientId = 1;
        promiseArray.push(promisifyQuery(patientIdInQuestionnaireDBQuery, [patientSerNum]))
    }

    q.all(promiseArray)
        .then(function(promiseArrayReturn){

            // the first item in the promiseArrayReturn should contain 1 patientId from answerQuestionnaire table
            if (promiseArrayReturn[0].length === 0){
                // there is no questionnaire that is incomplete and not deleted
                // note that throw will stop the code here and go to catch
                throw new Error('Error inputting questionnaire answers: there is no incomplete questionnaire matching the QuestionnaireSerNum');
            }

            patientId = promiseArrayReturn[0][0].patientId;

            // check if both patientId matches if the parameters.PatientId was given
            if (hasExternalPatientId === 1){
                if (patientId !== promiseArrayReturn[1][0].ID){
                    // note that throw will stop the code here and go to catch
                    throw new Error('Error inputting questionnaire answers: the patientSerNum given does not match to the patientId retrieved using QuestionnaireSerNum');
                }
            }

            r.resolve(patientId);
        })
        .catch(function(err){
            r.reject('Error inputting questionnaire answers: ', err);
        });

    return r.promise;
}

/**
 * inputAnswer
 * @desc inputAnswer inserts into the DB the answer for a single question
 * @param questionnaireId
 * @param answer {object}
 * @param languageId
 * @param patientId
 * @param dateCompleted
 * @param updateAuthor {string}
 * @return {promise}
 */
function inputAnswer(questionnaireId, answer, languageId, patientId, dateCompleted, updateAuthor){
    var r = q.defer();


    var answered = 1; // default for answered is 1 unless the answer is undefined
    var skipped = 0; // there is no option on the front-end right now to skip a question
    var answerId;
    
    // in the qplus, if the answer has been chosen but not filled in, the answer is undefined. In this new version of DB, this is not answered
    // the front end, in case of space only answer, sends Answer: 'undefined' as a string, thus the following check will make the Answer as not answered if the user inputs undefined in a textbox question
    // this can be solved by using trim() (javascript) on the front end (qplus)
    if (answer.Answer === undefined || !answer.Answer || typeof answer.Answer === "undefined" || answer.Answer === 'undefined' || answer.Answer === null){
        answered = 0;
    }

    promisifyQuery(insertIntoAnswerQuery, [questionnaireId, answer.sectionId, answer.questionId, answer.typeId, answer.answerSectionId,
        languageId, patientId, answered, skipped, dateCompleted, updateAuthor, dateCompleted, updateAuthor])
    .then(function(result){

        answerId = result.insertId;

        var promiseArray = [];

        if (answered !== 0){

            // see Questionnaire Migration document for matching the old types to new types
            switch (answer.QuestionType) {
                case ('yes'):
                // this matches to radio buttons in Questionnaire2019DB
                // we treat this the same way as MC type using a fall-through
                case ('MC'):
                    // this matches to radio buttons in Questionnaire2019DB
                    // get the radioButtonOption.ID from the answer text (need to search in the dictionary table)
                    // insert into answerRadioButton table

                    promiseArray.push(promisifyQuery(insertRadioButton, [answerId, answer.questionId, answer.Answer]));

                    break;
                case ('Checkbox'):
                    // this matches checkboxes in Questionnaire2019DB
                    // get the checkboxOption.ID from the answer text (need to search in the dictionary table)
                    // insert into answerCheckbox table

                    // in case of a checkbox, there are multiple answers per one question
                    // the front-end send an array inside answer.Answer each containing an answer

                    // sometimes the front end does not send in the array format
                    if (!(answer.Answer instanceof Array)){

                        answer.Answer = Object.values(answer.Answer);
                    }

                    for (var i = 0; i < answer.Answer.length; i++){

                        // sometimes, when the front end sends an array, it will contain multiple undefined objects in it
                        if (answer.Answer[i] !== undefined && answer.Answer[i] && typeof answer.Answer[i] !== "undefined" && answer.Answer[i] !== 'undefined' && answer.Answer[i] !== null){

                            promiseArray.push(promisifyQuery(insertCheckbox, [answerId, answer.questionId, answer.Answer[i]]));
                        }

                    }

                    break;
                case ('MinMax'):
                    // this matches sliders in Questionnaire2019DB
                    // insert the value directly into answerSlider table
                    promiseArray.push(promisifyQuery(insertSlider, [answerId, answer.Answer]));

                    break;
                case ('SA'):
                // this matches the text boxes in Questionnaire2019DB
                // insert the value directly into answerTextBox table
                // since we treat any other type same as text box, we use a fall-through here
                default:
                    // there should not be any other type in the legacy questionnaire, but just in case, we treat them as text box
                    promiseArray.push(promisifyQuery(insertTextBox, [answerId, answer.Answer]));

                    break;
            }
        }

        return q.all(promiseArray);
    }).then(function(result){

        r.resolve(result);
    }).catch(function(err){
        r.reject('Error inputting questionnaire answers: ', err);
    });

    return r.promise;
}

/**
 * promisifyQuery
 * @desc Turns a callback query function into a promise
 * @param query
 * @param parameters: the parameters to pass to the query
 * @return {promise}
 */
function promisifyQuery(query, parameters) {
    var r = q.defer();
    connection.query(query, parameters, function (err, rows, fields) {
        if (err) r.reject(err);
        else r.resolve(rows);
    });
    return r.promise;
}

/**
 * From this point is the new questionnaire front-end 19-08-2019
 */

exports.getQuestionnaireList = getQuestionnaireList;
exports.getQuestionnaire = getQuestionnaire;
exports.saveAnswer = saveAnswer;
exports.updateQuestionnaireStatusInQuestionnaireDB = updateQuestionnaireStatusInQuestionnaireDB;

/*
QUERIES
 */

const getQuestionnaireListQuery = `call getQuestionnaireList(?,?);`;
const getQuestionnaireQuery = `call getQuestionnaireInfo(?,?);`;
const getQuestionOptionsQuery = `CALL getQuestionOptions(?, ?, ?);`;
const saveAnswerQuery = `call saveAnswer(?,?,?,?,?,?,?);`;
const insertAnswerTextbox = `INSERT INTO answerTextBox (answerId, value) VALUES (?, ?)`;
const insertAnswerSlider = `INSERT INTO \`answerSlider\` (\`answerId\`, \`value\`) VALUES (?, ?)`;
const insertAnswerRadioButton = `INSERT INTO answerRadioButton (answerId, value) VALUES (?,?);`;
const insertAnswerTime = `INSERT INTO answerTime (answerId, value) VALUES (?, ?)`;
const insertAnswerDate = `INSERT INTO answerDate (answerId, value) VALUES (?, ?)`;
const insertAnswerLabel = `INSERT INTO answerLabel (answerId, selected, posX, posY, intensity, value) VALUES `;
const insertAnswerCheckbox = `INSERT INTO answerCheckbox (answerId, value) VALUES `;
const updateAnswerQuestionnaireStatus = `call updateAnswerQuestionnaireStatus(?,?,?);`;

/*
FUNCTIONS TO GET QUESTIONNAIRES
 */

/**
 * getQuestionnaireList
 * @desc this function get a list of questionnaire belonging to an user.
 * @param opalPatientSerNumAndLanguage {object} object containing PatientSerNum and Language as property. These information comes from OpalDB
 * @returns {promise}
 */
function getQuestionnaireList (opalPatientSerNumAndLanguage){
    var r = q.defer();

    // verify the argument
    if (!opalPatientSerNumAndLanguage.hasOwnProperty('PatientSerNum') || !opalPatientSerNumAndLanguage.hasOwnProperty('Language')
        || !opalPatientSerNumAndLanguage.PatientSerNum || !opalPatientSerNumAndLanguage.Language){
        r.reject(new Error('Error getting questionnaire list: No matching PatientSerNum or/and Language found in opalDB'));
    }else{
        // get questionnaire list
        promisifyQuery(getQuestionnaireListQuery, [opalPatientSerNumAndLanguage.PatientSerNum, opalPatientSerNumAndLanguage.Language])
            .then(function (queryResult) {

                // verify that the procedure has completed.
                // if the procedure did not complete, there will not be a property called procedure_status. If there is an error, the error code will be stored in procedure_status
                // the object containing property procedure_status is stored in the second last position in the returned array since the last position is used for OkPacket.
                if (!queryResult[queryResult.length - 2][0].hasOwnProperty('procedure_status') || queryResult[queryResult.length - 2][0].procedure_status !== 0){
                    r.reject(new Error('Error getting questionnaire list: query error'));
                }else{
                    r.resolve(queryResult[0]);
                }
            })
            .catch(function(err){
                r.reject(err);
            })
    }

    return r.promise;
}

/**
 * getQuestionnaire
 * @desc this function gets data related to that questionnaire, including answers
 * @param opalPatientSerNumAndLanguage {object}: object containing PatientSerNum and Language as property. These information comes from OpalDB
 * @param answerQuestionnaire_Id: This is the ID of the answerQuestionnaire (questionnaire belonging to that user and which the user would like to view). Should be passed from qplus.
 * @returns {promise}
 */
function getQuestionnaire (opalPatientSerNumAndLanguage, answerQuestionnaire_Id){
    var r = q.defer();

    var questionAndTypeMap = {};
    var lang_id;
    var questionnaireDataArray;
    var sectionDataArray;
    var questionDataArray;
    var answerDataArray; // note that this might not contain any useful data if the questionnaire is new
    var answerObject;

    /*
    TODO: delete the next part, this is for testing only
     */
    // answerQuestionnaire_Id = 392;

    // verify the argument
    if (!opalPatientSerNumAndLanguage.hasOwnProperty('PatientSerNum') || !opalPatientSerNumAndLanguage.hasOwnProperty('Language')
        || !opalPatientSerNumAndLanguage.PatientSerNum || !opalPatientSerNumAndLanguage.Language){
        r.reject(new Error('Error getting questionnaire list: No matching PatientSerNum or/and Language found in opalDB'));
    }else{
        promisifyQuery(getQuestionnaireQuery, [answerQuestionnaire_Id, opalPatientSerNumAndLanguage.Language])
            .then(function(queryResult){
                // verify that the procedure has completed.
                // if the procedure did not complete, there will not be a property called procedure_status. If there is an error, the error code will be stored in procedure_status
                // the object containing property procedure_status is stored in the second last position in the returned array since the last position is used for OkPacket.
                if (!queryResult[queryResult.length - 2][0].hasOwnProperty('procedure_status') || queryResult[queryResult.length - 2][0].procedure_status !== questionnaireConfig.PROCEDURE_SUCCESS_CODE ||
                    !queryResult[queryResult.length - 2][0].hasOwnProperty('language_id') || !queryResult[queryResult.length - 2][0].language_id) {
                    r.reject(new Error('Error getting questionnaire: query error'));
                }else{
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
            .then(function(questionOptionsAndTypeMap){

                var dataFormatted = formatQuestionnaire (questionnaireDataArray, sectionDataArray, questionDataArray, answerObject, questionOptionsAndTypeMap);

                r.resolve(dataFormatted);
            })
            .catch(function(err){
                r.reject(err);
        })
    }
    return r.promise;
}

/**
 * formatAnswer
 * @desc this function is a helper to organize the answers according to the questionSection_id if the questionnaire is not new.
 *       It also check the required properties of questionnaire and answers.
 * @param questionnaireDataArray {array}
 * @param answerDataArray {array}
 * @return answerObject {object} this object has questionSection_id as key, and an array of answers as value
 */
function formatAnswer(questionnaireDataArray, answerDataArray){
    var answerObject = {};

    // check properties of questionnaireDataArray
    if (!questionnaireDataArray[0].hasOwnProperty('qp_ser_num') || !questionnaireDataArray[0].qp_ser_num ||
        !questionnaireDataArray[0].hasOwnProperty('status') ||
        !questionnaireDataArray[0].hasOwnProperty('questionnaire_id') ||
        !questionnaireDataArray[0].hasOwnProperty('nickname') || !questionnaireDataArray[0].nickname){
        throw new Error("Error getting questionnaire: this questionnaire does not have the required properties");
    }

    // if new questionnaire, there will be no answers to format
    if (questionnaireDataArray[0].status === questionnaireConfig.NEW_QUESTIONNAIRE_STATUS){
        return answerObject;
    }

    // if in progress or completed questionnaire, organize the answers
    for (var i = 0; i < answerDataArray.length; i++){

        var answer = answerDataArray[i];

        // check property for every answer
        if (!answer.hasOwnProperty('answer_id') || !answer.hasOwnProperty('question_id') || !answer.hasOwnProperty('section_id') ||
            !answer.hasOwnProperty('type_id') || !answer.hasOwnProperty('answered') || !answer.hasOwnProperty('skipped') ||
            !answer.hasOwnProperty('created') || !answer.hasOwnProperty('last_updated') || !answer.hasOwnProperty('questionSection_id') ||
            !answer.hasOwnProperty('answer_value') || !answer.hasOwnProperty('intensity') || !answer.hasOwnProperty('posX') ||
            !answer.hasOwnProperty('posY') || !answer.hasOwnProperty('selected') || !answer.hasOwnProperty('questionnairePatientRelSerNum')){

            throw new Error("Error getting questionnaire: this questionnaire's answers do not have the required properties");
        }

        // initialize the questionSection_id as the key for answerObject
        if (answerObject[answer.questionSection_id] === undefined){
            answerObject[answer.questionSection_id] = [];
        }
        answerObject[answer.questionSection_id].push(answer);
    }

    return answerObject;
}

/**
 * formatQuestionnaire
 * @desc this function is a helper function for formatting one questionnaire data gotten from the questionnaireDB to the JSON accepted on the front end.
 * @param questionnaireDataArray {array}
 * @param sectionDataArray {array}
 * @param questionDataArray {array}
 * @param questionOptionsAndTypeMap {object}
 * @param answerObject {array}
 * @return returnedData {object} the fully formated object to send to front end
 */
function formatQuestionnaire (questionnaireDataArray, sectionDataArray, questionDataArray, answerObject, questionOptionsAndTypeMap){
    const char_limit_for_textbox = questionnaireConfig.CHAR_LIMIT_FOR_TEXTBOX;     // this is arbitrarily determined, can be changed

    // this function is used for formatting one questionnaire only. This is checked in the procedure getQuestionnaireInfo, but just in case that this function is being called by mistake.
    // verify required properties for the questionnaire data should be done in the calling function
    if (questionnaireDataArray.length !== 1){
        throw new Error("Error getting questionnaire: there is more than one or no questionnaire associated with the ID provided");
    }

    var sections = {};

    sectionDataArray.forEach(function(section){
        // check required properties for a section
        if (!section.hasOwnProperty('section_id') || !section.hasOwnProperty('section_position')){
            console.log("\n------------------------section property err ---------------------\n", section);
            throw new Error("Error getting questionnaire: this questionnaire's sections do not have required property");
        }

        // this is to prevent passing by reference
        sections[section.section_id] = Object.assign({}, {questions: []}, section);
    });

    questionDataArray.forEach(function (question) {
        // required properties should be checked beforehand by the calling function

        // this should not happen. A question should be contained in a section
        if (sections[question.section_id] === undefined){
            throw new Error("Error getting questionnaire: this questionnaire's question does not belong to a section");
        }

        // get the options for that question
        // if the options are not defined or are not inside an array for that question, raise error
        if (questionOptionsAndTypeMap[question.type_id][question.question_id] === undefined || !Array.isArray(questionOptionsAndTypeMap[question.type_id][question.question_id])){
            throw new Error("Error getting questionnaire: options do not exist for question");
        }

        var options =  questionOptionsAndTypeMap[question.type_id][question.question_id];

        // add character limit for textbox questions
        if (question.type_id === questionnaireConfig.TEXTBOX_TYPE_ID){
            if (options.length !== 1){
                throw new Error("Error getting questionnaire: text box question options error");
            }

            options[0].char_limit = char_limit_for_textbox;
        }

        // dealing with answers now
        var patient_answer = {};

        console.log("\n--------------------------answerObject--------------------\n", answerObject);

        // get the answers for that question if the questionnaire is not new
        if (questionnaireDataArray[0].status !== questionnaireConfig.NEW_QUESTIONNAIRE_STATUS) {
            // a question might have duplicates in a single section, but a questionSection_id is unique (reason for why the key is questionSection_id and not question_id)
            // the following check is for when the migration has not migrate the answers
            if (answerObject[question.questionSection_id] === undefined){
                patient_answer.answer = [];
            }else{
                patient_answer.answer = answerObject[question.questionSection_id];
            }

            patient_answer.is_defined = 1;
            console.log("\n-------------------question.questionSection_id--------------------\n", question.questionSection_id);
            console.log("\n-------------------answerObject[question.questionSection_id]--------------------\n", answerObject[question.questionSection_id]);
            console.log("\n-------------------patient_answer: progress or completed--------------------\n", patient_answer);
        }else{
            patient_answer.answer = [];
            patient_answer.is_defined = 0;
            console.log("\n-------------------patient_answer: new--------------------\n", patient_answer);
        }

        console.log("\n-------------------patient_answer--------------------\n", patient_answer);

        // combine the question general information with its answer and options
        var questionObject = Object.assign({},{options: options, patient_answer: patient_answer}, question);

        console.log("\n------------questionObject-------------\n", questionObject);

        sections[question.section_id].questions.push(questionObject);
    });

    // the use of Object.values is because the front-end uses indexes with is based off an array
    var returnedData = Object.assign({}, {sections: Object.values(sections)}, questionnaireDataArray[0]);

    console.log("\n ----------------------returnedData-----------------\n", returnedData);

    return returnedData;
}

/**
 * getQuestionAndTypeMap
 * @desc this function takes the array of questions (coming from the questionnaireDB) and sort them into different types.
 *      It is a helper for getting the options for questions
 *      It also verifies the properties of the questionDataArray for the calling function
 * @param questionDataArray {array}
 * @returns questionAndTypeMap {object} This object has type_id as keys, and an array of question_id as value
 */
function getQuestionAndTypeMap (questionDataArray){
    var questionAndTypeMap = {};

    questionDataArray.forEach(function (question) {
        // check required properties for a question
        if (!question.hasOwnProperty('section_id') || !question.hasOwnProperty('questionSection_id') || !question.hasOwnProperty('type_id') ||
            !question.hasOwnProperty('question_position') || !question.hasOwnProperty('orientation') || !question.hasOwnProperty('optional') ||
            !question.hasOwnProperty('question_type_category_key') || !question.hasOwnProperty('allow_question_feedback') ||
            !question.hasOwnProperty('polarity') || !question.hasOwnProperty('question_id') || !question.hasOwnProperty('question_text') ||
            !question.question_type_category_key || !question.question_text){

            console.log("\n ----------------question property error-------------", question);
            throw new Error("Error getting questionnaire: this questionnaire's questions do not have required properties");
        }

        // initialize for every type
        if (questionAndTypeMap[question.type_id] === undefined){
            questionAndTypeMap[question.type_id] = [];
        }

        questionAndTypeMap[question.type_id].push(question.question_id);

        // questionAndTypeMap[question.type_id].push({
        //     question_id: question.question_id,
        //     type_id: question.type_id,
        //     options: []
        // })
    });

    return questionAndTypeMap;
}

/**
 * getQuestionOptions
 * @desc This async function calls a procedure in the questionnaireDB to get all the question options according to the language passed.
 * @param questionAndTypeMap {object} this object should have type_id as key and question_id as value
 * @param languageId {int} this is the id in the questionnaireDB of the language required
 * @returns {promise} This promise resolves to questionOptionsAndTypeMap which is an object with type_id as keys and the options per questionId gotten from questionnaireDB as values
 *                      questionOptionsAndTypeMap should look like questionOptionsAndTypeMap[type_id][question_id][array of objects which are the options]
 */
function getQuestionOptions(questionAndTypeMap, languageId){
    var r = q.defer();
    var promiseArray = [];
    var questionOptionsAndTypeMap = {};
    var queryErr = 0;

    Object.keys(questionAndTypeMap).forEach(function(typeId){
        promiseArray.push(promisifyQuery(getQuestionOptionsQuery, [typeId, [questionAndTypeMap[typeId].join()], languageId]));
    });

    q.all(promiseArray)
        .then(function(returnedPromiseArray){
            for (var i = 0; i < returnedPromiseArray.length; i++){
                var typeQueryResponse = returnedPromiseArray[i];

                // verify that the procedure has completed.
                // if the procedure did not complete, there will not be a property called procedure_status. If there is an error, the error code will be stored in procedure_status
                // the object containing property procedure_status is stored in the second last position in the returned array since the last position is used for OkPacket.
                if(!typeQueryResponse[typeQueryResponse.length - 2][0].hasOwnProperty('procedure_status') || typeQueryResponse[typeQueryResponse.length - 2][0].procedure_status !== questionnaireConfig.PROCEDURE_SUCCESS_CODE ||
                    !typeQueryResponse[typeQueryResponse.length - 2][0].hasOwnProperty('type_id')){
                    queryErr = 1;
                    break;
                }

                // initialize the array.
                // questionOptionsAndTypeMap should look like questionOptionsAndTypeMap[type_id][question_id][array of objects which are the options]
                questionOptionsAndTypeMap[typeQueryResponse[typeQueryResponse.length - 2][0].type_id] = [];

                // check properties for each question options and group them by questionId
                for (var j = 0; j < typeQueryResponse[0].length; j++){
                    var typeQueryResponseRow = typeQueryResponse[0][j];

                    // verify properties
                    if (!typeQueryResponseRow.hasOwnProperty('questionId') || !typeQueryResponseRow.questionId){
                        queryErr = 1;
                        i = returnedPromiseArray.length;    // this is used to break from the outer loop
                        break;
                    }

                    // if required properties exist then sort them by question_id
                    if (questionOptionsAndTypeMap[typeQueryResponse[typeQueryResponse.length - 2][0].type_id][typeQueryResponseRow.questionId] === undefined){
                        questionOptionsAndTypeMap[typeQueryResponse[typeQueryResponse.length - 2][0].type_id][typeQueryResponseRow.questionId] = [];
                    }

                    questionOptionsAndTypeMap[typeQueryResponse[typeQueryResponse.length - 2][0].type_id][typeQueryResponseRow.questionId].push(typeQueryResponseRow);
                }
            }

            if (queryErr === 1){
                r.reject(new Error('Error getting questionnaire: query for question options error'));
            }else{
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
 * @param opalPatientSerNumAndLanguage {object} must contain PatientSerNum and Language as properties. This should be gotten directly from the OpalDB
 * @param param {object} the parameters passed from the front-end. The calling function must verify its properties.
 * @param appVersion {String} a string denoting the version of the app.
 * @returns {promise}
 */
function saveAnswer(opalPatientSerNumAndLanguage, param, appVersion){

    var r = q.defer();
    var isoLang;
    var answerId;

    // r.reject(new Error('Will this stop?'));
    //
    // console.log("\n---------------------------\you can see this if r.reject did not stop");
    //
    // throw new Error('STOPPED');

    // verify the argument
    if (!opalPatientSerNumAndLanguage.hasOwnProperty('PatientSerNum') || !opalPatientSerNumAndLanguage.hasOwnProperty('Language')
        || !opalPatientSerNumAndLanguage.PatientSerNum || !opalPatientSerNumAndLanguage.Language){
        r.reject(new Error('Error saving questionnaire: No matching PatientSerNum or/and Language found in opalDB'));

    }else{
        isoLang = opalPatientSerNumAndLanguage.Language;

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

        promisifyQuery(saveAnswerQuery, [param.answerQuestionnaire_id, param.section_id, param.question_id, param.question_type_id, param.is_skipped, appVersion, isoLang])
            .then(function(queryResult){
                // verify that the procedure has completed.
                // if the procedure did not complete, there will not be a property called procedure_status. If there is an error, the error code will be stored in procedure_status
                // the object containing property procedure_status is stored in the second last position in the returned array since the last position is used for OkPacket.
                if (!queryResult[queryResult.length - 2][0].hasOwnProperty('procedure_status')){
                    r.reject(new Error('Error saving answer: query uncompleted'));
                }else if(queryResult[queryResult.length - 2][0].procedure_status !== questionnaireConfig.PROCEDURE_SUCCESS_CODE) {
                    if (queryResult[queryResult.length - 2][0].hasOwnProperty('procedure_message')) {
                        r.reject(new Error('Error saving answer: query unsuccessful due to ' + queryResult[queryResult.length - 2][0].procedure_message));
                    } else {
                        r.reject(new Error('Error saving answer: query unsuccessful'));
                    }
                } else if (!queryResult[queryResult.length - 2][0].hasOwnProperty('inserted_answer_id') || !queryResult[queryResult.length - 2][0].hasOwnProperty('question_type_name_EN')){
                    r.reject(new Error('Error saving answer: query unsuccessful'));
                }else{
                    answerId = queryResult[queryResult.length - 2][0].inserted_answer_id;

                    // TODO: this does not cover the case of skipped answer, but since skipped is not implemented yet, it's fine

                    // 5. using the insertId from 4. and using answer array and question_type_id from param, insert into the sub-answer tables
                    // parseInt is used here just in case that the front end sent a string
                    return insertAnswerByType(answerId, param.answer, parseInt(param.question_type_id));
                }
            })
            .then(function(insertAnswerResult){
                r.resolve('AnswerId: ' + answerId + '. Insert answer by type: ' + insertAnswerResult);
            })
            .catch(function(err){
                r.reject(err);
        });
    }
    return r.promise;
}

/**
 * insertAnswerByType
 * @desc this is a helper function which insert answers to specific table in the DB depending on the question type.
 * @param answerId {int} this is the ID of the answer inserted for that question in the answer table.
 * @param answerArray {array} this is the array of objects passed from the front-end. We check the property for them. A common property is answer_value.
 * @param question_typeId {int} this denotes the type of the question
 * @returns {promise}
 */
function insertAnswerByType (answerId, answerArray, question_typeId){
    var r = q.defer();

    console.log ("\n-------------in insertAnswerByType: answerArray: --------------------------", answerArray);
    console.log ("\n-------------in insertAnswerByType: answerId: --------------------------", answerId);
    console.log ("\n-------------in insertAnswerByType: question_typeId: --------------------------", question_typeId);

    var promiseArray = [];  // this should contain only one query. It is used to avoid r.reject not doing a break.

    switch (question_typeId) {
        case questionnaireConfig.CHECKBOX_TYPE_ID:
            var isErr = 0;
            var insert_array_string = "";
            var insert_value_string = "(?,?)";
            var insert_param_array = [];

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
            for (var i=0; i<answerArray.length; i++){
                if (!answerArray[i].hasOwnProperty('answer_value')){
                    isErr = 1;
                }else if (isNaN(parseInt(answerArray[i].answer_value))){
                        // check the validity of the answer: If the first character cannot be converted to a number, parseInt() returns NaN
                        // it should not happen since the answer value should be the ID of the option
                        // TODO: error handling
                }else {
                    // if this is not the last value inserted, then add a comma
                    if (i !== answerArray.length - 1){
                        insert_array_string = insert_array_string + insert_value_string + ", ";
                    }else{
                        // if this is the last value, add a semi-colon
                        insert_array_string = insert_array_string + insert_value_string + ";";
                    }
                    insert_param_array.push(answerId);
                    insert_param_array.push(answerArray[i].answer_value);
                }
            }

            if (isErr !== 0){
                r.reject(new Error ('Error saving answer: no required properties in answer array'));
            }else{
                var query = insertAnswerCheckbox + insert_array_string;
                console.log("\n-------------in insertAnswerByType: checkbox, query: --------------------------", query);
                console.log("\n-------------in insertAnswerByType: checkbox, insert_param_array: --------------------------", insert_param_array);
                promiseArray.push(promisifyQuery(query, insert_param_array));
            }
            break;

        case questionnaireConfig.SLIDER_TYPE_ID:
            if (answerArray.length !== 1 || !answerArray[0].hasOwnProperty('answer_value')){
                r.reject(new Error ('Error saving answer: answer array does not have the correct length or no property answer_value in answer array'));
            }else if (isNaN(parseFloat(answerArray[0].answer_value))) {
                // it should not happen since the answer value should be a float
                // TODO: error handling
            }else {
                promiseArray.push(promisifyQuery(insertAnswerSlider, [answerId, answerArray[0].answer_value]));
            }
            break;

        case questionnaireConfig.TEXTBOX_TYPE_ID:
            if (answerArray.length !== 1 || !answerArray[0].hasOwnProperty('answer_value')){
                r.reject(new Error ('Error saving answer: answer array does not have the correct length or no property answer_value in answer array'));
            }else{
                promiseArray.push(promisifyQuery(insertAnswerTextbox, [answerId, answerArray[0].answer_value]));
            }
            break;

        case questionnaireConfig.RADIOBUTTON_TYPE_ID:
            if (answerArray.length !== 1 || !answerArray[0].hasOwnProperty('answer_value')){
                r.reject(new Error ('Error saving answer: answer array does not have the correct length or no property answer_value in answer array'));
            }else if (isNaN(parseInt(answerArray[0].answer_value))) {
                // it should not happen since the answer value should be a bigint = ID of radio button option
                // TODO: error handling
            }else{
                promiseArray.push(promisifyQuery(insertAnswerRadioButton, [answerId, answerArray[0].answer_value]));
            }
            break;

        case questionnaireConfig.LABEL_TYPE_ID:
            var insert_array_string = "";
            var isErr = 0;

            for (var i = 0; i < answerArray.length; i++){
                if (!answerArray[i].hasOwnProperty('answer_value') || !answerArray[i].hasOwnProperty('selected') || !answerArray[i].hasOwnProperty('posX') ||
                    !answerArray[i].hasOwnProperty('posY') || !answerArray[i].hasOwnProperty('intensity')){
                    // this is a flag for outside the for loop due to r.reject does not stop the execution of the code
                    isErr = 1;
                    break;

                }else if (isNaN(parseInt(answerArray[i].answer_value)) || isNaN(parseInt(answerArray[i].posY)) ||
                    isNaN(parseInt(answerArray[i].posX)) || isNaN(parseInt(answerArray[i].intensity)) ||
                    isNaN(parseInt(answerArray[i].selected))){
                    // should not happen
                    // TODO: error handling
                }else{
                    // this is the string for inserted value. It should look like this at the end of the loop:
                    /*
                    INSERT INTO answerLabel(answerId, selected, posX, posY, intensity, value)
                    VALUES
                    (answerId, selected, posX, posY, intensity, answer_value),
                    (answerId, selected, posX, posY, intensity, answer_value),
                    (answerId, selected, posX, posY, intensity, answer_value)

                     */
                    // this is to avoid unnecessary network transaction when calling the DB
                    var value_string = "(" + answerId + ", " +  answerArray[i].selected + ", " + answerArray[i].posX + ", " +
                        answerArray[i].posY + ", " + answerArray[i].intensity + ", " + answerArray[i].answer_value + ")";

                    // add comma if this is not the last inserted value
                    if (i !== answerArray.length-1){
                        value_string = value_string + ",";
                    }else{
                        // if this is the last one, add a semi-colon
                        value_string = value_string + ";";
                    }
                    insert_array_string = insert_array_string + value_string;
                }
            }

            if (isErr === 0){
                var query = insertAnswerLabel + insert_array_string;
                promiseArray.push(promisifyQuery(query, []));
            }else{
                r.reject(new Error ('Error saving answer: no required properties in answer array'));
            }
            break;

        case questionnaireConfig.TIME_TYPE_ID:
            if (answerArray.length !== 1 || !answerArray[0].hasOwnProperty('answer_value')){
                r.reject(new Error ('Error saving answer: answer array does not have the correct length or no property answer_value in answer array'));
            }else{
                promiseArray.push(promisifyQuery(insertAnswerTime, [answerId, answerArray[0].answer_value]));
            }
            break;
        case questionnaireConfig.DATE_TYPE_ID:
            if (answerArray.length !== 1 || !answerArray[0].hasOwnProperty('answer_value')){
                r.reject(new Error ('Error saving answer: answer array does not have the correct length or no property answer_value in answer array'));
            }else{
                promiseArray.push(promisifyQuery(insertAnswerDate, [answerId, answerArray[0].answer_value]));
            }
            break;
        default:
            r.reject(new Error('Error saving answer: do not have an answer table matching the question type. The answerId in answer table is: '+ answerId));
    }

    q.all(promiseArray)
        .then(function(queryResult){
            r.resolve(queryResult);

        }).catch(function(err){
            r.reject(err);
    });

    return r.promise;
}

/**
 * updateQuestionnaireStatusInQuestionnaireDB
 * @desc This function is exported and is used to update the questionnaire status in the questionnaireDB
 * @param answerQuestionnaireId The unique Id of the answerQuestionnaire table
 * @param newStatus denote the status to be updated to. It should match the database convention of being either 0,1,2
 * @param appVersion {String} a string denoting the version of the app. This is used for noting the author of update
 * @returns {promise} resolve with a boolean denoting whether the questionnaire's new status is completed or not
 */
function updateQuestionnaireStatusInQuestionnaireDB(answerQuestionnaireId, newStatus, appVersion) {
    var r = q.defer();

    var isCompleted = 0;
    var newStatusInt = parseInt(newStatus);

    // preprocess arguments passed
    if (newStatusInt === questionnaireConfig.COMPLETED_QUESTIONNAIRE_STATUS){
        isCompleted = 1;
    }else if (newStatusInt !== questionnaireConfig.IN_PROGRESS_QUESTIONNAIRE_STATUS && newStatusInt !== questionnaireConfig.NEW_QUESTIONNAIRE_STATUS){
        throw new Error("Error updating the questionnaire status: the new status is not in progress, completed, or new");
    }

    promisifyQuery(updateAnswerQuestionnaireStatus, [answerQuestionnaireId, newStatus, appVersion])
        .then(function(queryResult){
            // verify that the procedure has completed.
            // if the procedure did not complete, there will not be a property called procedure_status. If there is an error, the error code will be stored in procedure_status
            // the object containing property procedure_status is stored in the second last position in the returned array since the last position is used for OkPacket.
            if (!queryResult[queryResult.length - 2][0].hasOwnProperty('procedure_status')){
                r.reject(new Error('Error updating the questionnaire status: query uncompleted'));
            }else if(queryResult[queryResult.length - 2][0].procedure_status !== questionnaireConfig.PROCEDURE_SUCCESS_CODE) {
                if (queryResult[queryResult.length - 2][0].hasOwnProperty('procedure_message')) {
                    r.reject(new Error('Error updating the questionnaire status: query unsuccessful due to ' + queryResult[queryResult.length - 2][0].procedure_message));
                } else {
                    r.reject(new Error('Error updating the questionnaire status: query unsuccessful'));
                }
            }

            r.resolve(isCompleted);

        }).catch(function(err){
            r.reject(err);
        });

    return r.promise;
}