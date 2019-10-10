var exports = module.exports = {};
var mysql = require('mysql');
var q = require('q');
var credentials = require('./../config.json');
const logger = require('./../logs/logger');

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
 * @param patientQuestionnaireTableFields: this is the list of questionnaires gotten from the opalDB
 * @param lang: this is the language pre-processed in the calling function: getQuestionnaires
 * @return {Promise}
 */
exports.getPatientQuestionnaires = function (patientQuestionnaireTableFields, lang) {
    return new Promise(((resolve, reject) => {

        console.log("\n----------in getPatientQuestionnaires: patientQuestionnaireTableFields--------------", patientQuestionnaireTableFields);
        console.log("\n----------in getPatientQuestionnaires: lang--------------", lang);

        if (patientQuestionnaireTableFields.length !== 0) {

            let questionnaireDBSerNumArray = getQuestionnaireDBSerNums(patientQuestionnaireTableFields);

            // the following join in the argument is due to us calling a procedure using CONCAT with a prepared statement,
            // which requires a TEXT argument in the following format: '11,12,23,..'
            connection.query(queryQuestions, [questionnaireDBSerNumArray.join()], function (err, questions, fields) {
                if (err){
                    reject(err);
                }else{
                    let questionsOrdered = setQuestionOrder(questions[0]);

                    getQuestionChoices(questionsOrdered).then(function (questionsChoices) {

                        let questionnaires = prepareQuestionnaireObject(questionsChoices, patientQuestionnaireTableFields);
                        let patientQuestionnaires = {};

                        attachingQuestionnaireAnswers(patientQuestionnaireTableFields, lang).then(function (paQuestionnaires) {
                            patientQuestionnaires = paQuestionnaires;
                            resolve({'Questionnaires': questionnaires, 'PatientQuestionnaires': patientQuestionnaires});
                        }).catch(function (error) {
                            reject(error);
                        });
                    }).catch(function (err) {
                        reject(err);
                    })
                }
            });
        } else {
            resolve([]);
        }
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
            questionnairesObject[questionnaires[i].QuestionnaireDBSerNum].Intro_EN = htmlspecialchars_decode(questionnaires[i].Intro_EN);
            questionnairesObject[questionnaires[i].QuestionnaireDBSerNum].QuestionnaireName_FR = questionnaires[i].QuestionnaireName_FR;
            questionnairesObject[questionnaires[i].QuestionnaireDBSerNum].Intro_FR = htmlspecialchars_decode(questionnaires[i].Intro_FR);
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
 * htmlspecialchars_decode
 * @desc this is a helper function used to decode html encoding
 * @param string
 * @param quoteStyle
 * @returns {string} decoded string
 */
function htmlspecialchars_decode (string, quoteStyle) {
    var optTemp = 0;
    var i = 0;
    var noquotes = false;

    if (typeof quoteStyle === 'undefined') {
        quoteStyle = 2;
    }
    string = string.toString()
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>');
    var OPTS = {
        'ENT_NOQUOTES': 0,
        'ENT_HTML_QUOTE_SINGLE': 1,
        'ENT_HTML_QUOTE_DOUBLE': 2,
        'ENT_COMPAT': 2,
        'ENT_QUOTES': 3,
        'ENT_IGNORE': 4
    };

    if (quoteStyle === 0) {
        noquotes = true;
    }
    if (typeof quoteStyle !== 'number') {
        // Allow for a single string or an array of string flags
        quoteStyle = [].concat(quoteStyle);
        for (i = 0; i < quoteStyle.length; i++) {
            if (OPTS[quoteStyle[i]] === 0) {
                noquotes = true;
            } else if (OPTS[quoteStyle[i]]) {
                optTemp = optTemp | OPTS[quoteStyle[i]];
            }
        }
        quoteStyle = optTemp
    }
    if (quoteStyle & OPTS.ENT_HTML_QUOTE_SINGLE) {
        string = string.replace(/&#0*39;/g, "'");
    }
    if (!noquotes) {
        string = string.replace(/&quot;/g, '"');
    }

    string = string.replace(/&amp;/g, '&');

    return string;
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

            if (err){
                r.reject(err);
            }else{
                var questions = attachChoicesToQuestions(rows, choices[0]);

                r.resolve(questions);
            }
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
 * @param questionnairesSentToPatient: The list of questionnaires sent to patients. This info is obtained by querying questionnaires in opalDB
 * @param lang: the language that the answers are going to be displayed in case the answers have languageId = -1 in the database. This should be obtained from the front end or the opalDB
 *              and pre-processed in getPatientQuestionnaires or the calling function
 * @return {promise}
 */
function attachingQuestionnaireAnswers(questionnairesSentToPatient, lang) {

    var r = q.defer();

    var patientQuestionnaires = {};
    var answerQuestionnaireIdArray = [];

    for (var i = 0; i < questionnairesSentToPatient.length; i++) {
        patientQuestionnaires[questionnairesSentToPatient[i].QuestionnaireSerNum] = questionnairesSentToPatient[i];

        if (questionnairesSentToPatient[i].CompletedFlag === 1 || questionnairesSentToPatient[i].CompletedFlag === '1') {
            if (questionnairesSentToPatient[i].PatientQuestionnaireDBSerNum === null || questionnairesSentToPatient[i].PatientQuestionnaireDBSerNum === undefined){
                // this should never happen. this means that the questionnaire is completed but there is no answer for it. This would be an error in the database
                // TODO: report something back
            }else{
                answerQuestionnaireIdArray.push(questionnairesSentToPatient[i].PatientQuestionnaireDBSerNum);
            }
        }
    }
    if (answerQuestionnaireIdArray.length > 0) {

        var quer = connection.query(queryAnswers, [answerQuestionnaireIdArray.join(), lang], function (err, rows, fields) {

            if (err){
                r.reject(err);
            } else{
                // the following line is due to us calling a stored procedure
                rows = rows[0];

                // inserting the answers according to the questionnaire
                // this is for when a question can have multiple answers
                var answersQuestionnaires = {};

                for (var i = 0; rows && i < rows.length; i++) {
                    // note: due to the change of where to get the new questionnaires, the QuestionnaireSerNum which meant answerQuestionnaireId before was transformed into opalDB.questionnaire.ID
                    // but here QuestionnaireSerNum still means answerQuestionnaireId since it comes from the procedure in the questionnaireDB.
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

                        patientQuestionnaires[questionnairesSentToPatient[i].QuestionnaireSerNum].Answers = answersQuestionnaires[questionnairesSentToPatient[i].PatientQuestionnaireDBSerNum];
                    }
                }

                r.resolve(patientQuestionnaires);
            }
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
var updateStatusCompletedInAnswerQuestionnaireQuery = `UPDATE \`answerQuestionnaire\` SET \`status\`='2', \`lastUpdated\`=?, \`updatedBy\`=? WHERE  \`ID\`=?;`;
var insertInAnswerQuestionnaireQuery = `INSERT INTO \`answerQuestionnaire\` (\`questionnaireId\`, \`patientId\`, \`status\`, \`deleted\`, \`deletedBy\`, \`creationDate\`, \`createdBy\`, \`lastUpdated\`, \`updatedBy\`) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?);`;
var insertSectionIntoAnswerSectionQuery = `REPLACE INTO answerSection(answerQuestionnaireId, sectionId) VALUES (?, ?);`;

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
    const completedStatus = 2;
    const deleted = 0;
    const deletedBy = '';
    var answerQuestionnaireId = -1;

    console.log("\n--------------in inputQuestionnaireAnswers, questionnaire-------------------");

    promisifyQuery(patientIdInQuestionnaireDBQuery, [patientSerNum])
       .then(function(patientId_questionnaireDB){

           console.log("\n--------------in inputQuestionnaireAnswers, questionnaire, after getting patientId: patientId_questionnaireDB-------------------", patientId_questionnaireDB);

           patientId = patientId_questionnaireDB[0].ID;
           authorOfUpdate = patientId + '_APP_' + appVersion;

           // insert in `answerQuestionnaire` table
           return promisifyQuery(insertInAnswerQuestionnaireQuery, [parameters.QuestionnaireDBSerNum, patientId, completedStatus, deleted, deletedBy, parameters.DateCompleted, authorOfUpdate, parameters.DateCompleted, authorOfUpdate]);

       }).then(function(insertReturn){

           console.log("\n--------------in inputQuestionnaireAnswers, questionnaire, after inserting the answer questionnaire-------------------");

           console.log("\n----------insertReturn---------",insertReturn);

           if (insertReturn.hasOwnProperty('insertId') && insertReturn.insertId !== undefined){
               answerQuestionnaireId = insertReturn.insertId;
           }

           // gets the questionId, sectionId and type of question from the questionnaireQuestionSerNum of one answer, also the answerSectionId
            // transform the object parameters.Answers into an array to ensure order
           return inputAnswerSection(answerQuestionnaireId, Object.values(parameters.Answers));

       }).then(function(formattedAnswers){

           console.log("\n--------------in inputQuestionnaireAnswers, questionnaire, after inputting answer section-------------------");

           var promiseArray = [];

           for (var i = 0; i < formattedAnswers.length; i++){

               promiseArray.push(inputAnswer(parameters.QuestionnaireDBSerNum, formattedAnswers[i], parameters.Language, patientId, parameters.DateCompleted, authorOfUpdate));
           }

           return q.all(promiseArray);
       }).then(function(result){

           r.resolve(answerQuestionnaireId);

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

    if (answerQuestionnaireId === undefined || answerQuestionnaireId === null || answerQuestionnaireId === -1){
        throw new Error('Error inputting questionnaire answers: Failed to get answerQuestionnaireId');
    }

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