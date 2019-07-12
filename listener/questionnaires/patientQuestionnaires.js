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

// new
// query to emulate patientQuestionnaireTableFields in the new Database
var queryPatientQuestionnaireInfo = `SELECT IF(\`status\` <> 2, 0, 1) AS CompletedFlag,
    creationDate AS DateAdded,
    IF(\`status\` <> 2, NULL, lastUpdated) AS CompletionDate,
    ID AS QuestionnaireSerNum,
    questionnaireId AS QuestionnaireDBSerNum
FROM answerQuestionnaire
WHERE deleted <> 1
AND patientId IN (
    SELECT ID
FROM patient
WHERE externalId = ?
AND deleted <> 1
);`;

//Queries to obtain the questions and question choices for questionnaires
// var queryQuestions = `SELECT DISTINCT Questionnaire.QuestionnaireSerNum as QuestionnaireDBSerNum,
//                         Questionnaire.QuestionnaireName,
//                         QC.QuestionnaireName_EN,
//                         QC.Intro_EN,
//                         QC.QuestionnaireName_FR,
//                         QC.Intro_FR,
//                         QuestionnaireQuestion.QuestionnaireQuestionSerNum,
//                         Question.QuestionSerNum,
//                         Question.isPositiveQuestion,
//                         Question.QuestionQuestion as QuestionText_EN,
//                         Question.QuestionName as Asseses_EN,
//                         Question.QuestionName_FR as Asseses_FR,
//                         Question.QuestionQuestion_FR as QuestionText_FR,
//                         QuestionType.QuestionType,
//                         QuestionType.QuestionTypeSerNum,
//                         QuestionnaireQuestion.OrderNum
//                       FROM Questionnaire,
//                         Question,
//                         QuestionType,
//                         Patient,
//                         QuestionnaireQuestion,
//                         ` + credentials.MYSQL_DATABASE + `.QuestionnaireControl QC
//                       WHERE QuestionnaireQuestion.QuestionnaireSerNum = Questionnaire.QuestionnaireSerNum
//                         AND QuestionnaireQuestion.QuestionSerNum = Question.QuestionSerNum
//                         AND Question.QuestionTypeSerNum = QuestionType.QuestionTypeSerNum
//                         AND QC.QuestionnaireDBSerNum = Questionnaire.QuestionnaireSerNum
//                         AND Questionnaire.QuestionnaireSerNum IN ?`;

// new one
// since a section can only be contained in one questionnaire,
// questionSection.ID can be thought as QuestionnaireQuestionSerNum because there is only one per combination of sectionId and questionId
var queryQuestions = `SELECT questionnaire.ID AS QuestionnaireDBSerNum,
	questionnaire.legacyName AS QuestionnaireName,
	IF (questionnaire.nickname <> -1, getDisplayName(questionnaire.nickname,2), getDisplayName(questionnaire.title,2)) AS QuestionnaireName_EN,
	IF (questionnaire.nickname <> -1, getDisplayName(questionnaire.nickname,1), getDisplayName(questionnaire.title,1)) AS QuestionnaireName_FR,
	getDisplayName(questionnaire.description,2) AS Intro_EN,
	getDisplayName(questionnaire.description,1) AS Intro_FR,
	sec.ID AS sectionId,
	sec.\`order\` AS secOrder,
	qSec.ID AS QuestionnaireQuestionSerNum,
	qSec.questionId AS QuestionSerNum,
	q.polarity AS isPositiveQuestion,
	getDisplayName(q.question,2) AS QuestionText_EN,
	getDisplayName(q.question,1) AS QuestionText_FR,
	getDisplayName(display, 2) AS Asseses_EN,
	getDisplayName(display, 1) AS Asseses_FR,
	legacyType.legacyName AS QuestionType,
	q.legacyTypeId AS QuestionTypeSerNum,
	qSec.\`order\` AS qOrder
FROM questionnaire
	LEFT JOIN section sec ON (sec.questionnaireId = questionnaire.ID)
	LEFT JOIN questionSection qSec ON (qSec.sectionId = sec.ID)
	LEFT JOIN question q ON (qSec.questionId = q.ID)
	LEFT JOIN legacyType ON (q.legacyTypeId = legacyType.ID)
WHERE questionnaire.ID IN ?
	AND questionnaire.deleted <> 1
	AND sec.deleted <> 1
	AND q.deleted <> 1;`;

// var queryQuestionChoices = "SELECT QuestionSerNum, MCSerNum as OrderNum, MCDescription as ChoiceDescription_EN, MCDescription_FR as ChoiceDescription_FR  FROM QuestionMC WHERE QuestionSerNum IN ? UNION ALL SELECT * FROM QuestionCheckbox WHERE QuestionSerNum IN ? UNION ALL SELECT * FROM QuestionMinMax WHERE QuestionSerNum IN ? ORDER BY QuestionSerNum, OrderNum DESC";

// new one
var queryQuestionChoices = `SELECT rb.questionId AS QuestionSerNum,
	rbOpt.\`order\` AS OrderNum,
	getDisplayName(rbOpt.description, 2) AS ChoiceDescription_EN,
	getDisplayName(rbOpt.description, 1) AS ChoiceDescription_FR
FROM radioButton rb, radioButtonOption rbOpt
WHERE rb.Id = rbOpt.parentTableId
	AND rb.questionId IN ?
UNION ALL 
SELECT c.questionId,
	cOpt.\`order\`,
	getDisplayName(cOpt.description, 2) AS ChoiceDescription_EN,
	getDisplayName(cOpt.description, 1) AS ChoiceDescription_FR
FROM checkbox c, checkboxOption cOpt
WHERE c.ID = cOpt.parentTableId
	AND c.questionId IN ?
UNION ALL 
SELECT slider.questionId,
	slider.minValue - 1 AS OrderNum,
	getDisplayName(slider.minCaption, 2) AS ChoiceDescription_EN,
	getDisplayName(slider.minCaption, 1) AS ChoiceDescription_FR
FROM slider
WHERE slider.questionId IN ?
UNION ALL 
SELECT slider.questionId,
	slider.\`maxValue\` AS OrderNum,
	getDisplayName(slider.maxCaption, 2) AS ChoiceDescription_EN,
	getDisplayName(slider.maxCaption, 1) AS ChoiceDescription_FR
FROM slider
WHERE slider.questionId IN ?
UNION ALL 
SELECT l.questionId,
	lOpt.\`order\`,
	getDisplayName(lOpt.description, 2) AS ChoiceDescription_EN,
	getDisplayName(lOpt.description, 1) AS ChoiceDescription_FR
FROM label l, labelOption lOpt
WHERE l.ID = lOpt.parentTableId
	AND l.questionId IN ?
ORDER BY QuestionSerNum, OrderNum DESC;`;

// var queryAnswersPatientQuestionnaire = "SELECT QuestionnaireQuestionSerNum, Answer.Answer, PatientQuestionnaireSerNum as PatientQuestionnaireDBSerNum FROM Answer WHERE PatientQuestionnaireSerNum IN ? ORDER BY PatientQuestionnaireDBSerNum;"

// new one, require getAnswerText function in DB
// note that this query does not take answered and skipped answers into account since these functionnalities do not exist yet in the qplus
// if not answered or skipped, since there won't be an entry in the answer(Type) tables, the query will return NULL
var queryAnswersPatientQuestionnaire = `SELECT aSec.answerQuestionnaireId AS QuestionnaireSerNum,
	a.ID,
	a.languageId,
    qSec.ID AS QuestionnaireQuestionSerNum
FROM (answerSection aSec
LEFT JOIN answer a ON (a.answerSectionId = aSec.ID)),
questionSection qSec
WHERE aSec.answerQuestionnaireId IN ?
    AND a.deleted <> 1
AND qSec.questionId = a.questionId
AND qSec.sectionId = a.sectionId
;`;

//     `SELECT aSec.answerQuestionnaireId AS QuestionnaireSerNum,
// if (a.languageId <> -1, getAnswerText(a.ID, a.languageId), getAnswerText(a.ID, ?)) AS Answer,
//     qSec.ID AS QuestionnaireQuestionSerNum
// FROM (answerSection aSec
// LEFT JOIN answer a ON (a.answerSectionId = aSec.ID)),
// questionSection qSec
// WHERE aSec.answerQuestionnaireId IN ?
//     AND a.deleted <> 1
// AND qSec.questionId = a.questionId
// AND qSec.sectionId = a.sectionId
// ;`;

var queryAnswerText = `CALL getAnswerText(?,?);`;

/*SELECT QuestionnaireQuestionSerNum,  GROUP_CONCAT(Answer SEPARATOR ', ') as Answer, PatientQuestionnaireSerNum as PatientQuestionnaireDBSerNum FROM Answer WHERE PatientQuestionnaireSerNum IN ? GROUP BY QuestionnaireQuestionSerNum ORDER BY PatientQuestionnaireDBSerNum;"*/
exports.getPatientQuestionnaires = function (patientId, lang) {
    return new Promise(((resolve, reject) => {

        // console.log("\n******** in getPatientQuestionnaires, before queryPatientQuestionnaireInfo: ***********\n", patientId[0].PatientId);

        connection.query(queryPatientQuestionnaireInfo, [patientId[0].PatientId], function (err, rows, fields) {
            console.log("\n******** in getPatientQuestionnaires, after queryPatientQuestionnaireInfo: ***********\n", rows);
            if (rows.length !== 0) {
                // console.log("\n******** in getPatientQuestionnaires, after queryPatientQuestionnaireInfo: ***********\n", rows);

                let questionnaireDBSerNumArray = getQuestionnaireDBSerNums(rows);

                console.log("\n******** in getPatientQuestionnaires, before queryQuestions: ***********\n", questionnaireDBSerNumArray);

                connection.query(queryQuestions, [[questionnaireDBSerNumArray]], function (err, questions, fields) {
                    if (err) reject(err);

                    console.log("\n******** in getPatientQuestionnaires, after queryQuestions: ***********\n", questions);

                    let questionsOrdered = setQuestionOrder(questions);

                    // console.log("\n******** in getPatientQuestionnaires, after ordering questions: ***********\n", questionsOrdered);

                    logger.log('debug', "******** in getPatientQuestionnaires, after ordering questions: ***********\n" + JSON.stringify(questionsOrdered));

                    getQuestionChoices(questionsOrdered).then(function (questionsChoices) {

                        // console.log("\n******** in getPatientQuestionnaires, after getQuestionChoices: ***********\n", questionsChoices);

                        logger.log('debug', "******** in getPatientQuestionnaires, after getQuestionChoices: ***********\n" + JSON.stringify(questionsChoices));

                        let questionnaires = prepareQuestionnaireObject(questionsChoices, rows);
                        let patientQuestionnaires = {};

                        attachingQuestionnaireAnswers(rows, lang).then(function (paQuestionnaires) {
                            console.log("\n******** in getPatientQuestionnaires, after attachingQuestionnaireAnswers: ***********\n", paQuestionnaires);
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

//Formats questionnaire object to be ready for the app.
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

// from section order and questions' order inside that section, transform the data into a single ordering of questions
// TODO: this needs testing by having multiple sections for 1 questionnaire
function setQuestionOrder(questions) {

    console.log('******** in setQuestionsOrder *************', questions);
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
            if (questions[i].secOrder == currSecOrder) {
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
        for (var k in Object.keys(numberOfQuestionsInThisSection)) {
            if (numberOfQuestionsInPrevSections.hasOwnProperty(k)) {
                numberOfQuestionsInPrevSections[k] += numberOfQuestionsInThisSection[k];
            }
        }
    }

    return questions;
}

//Extracts only questionnaireSerNum for query injection
function getQuestionnaireDBSerNums(rows) {
    return rows.map(q => q.QuestionnaireDBSerNum)
}

//Gets the choices for  questions
function getQuestionChoices(rows) {
    var r = q.defer();
    var array = [];
    if (rows) {
        for (var i = 0; i < rows.length; i++) {
            array.push(rows[i].QuestionSerNum);
        }

        connection.query(queryQuestionChoices, [[array], [array], [array], [array], [array]], function (err, choices, fields) {

            // connection.query(queryQuestionChoices, [[array], [array], [array]], function (err, choices, fields) {
            //console.log(err);
            // logger.log('error', err);
            if (err) r.reject(err);


            // console.log("\n******** in getQuestionChoices, after queryQuestionChoices: ***********\n", choices);
            var questions = attachChoicesToQuestions(rows, choices);
            // console.log(questions);
            // logger.log('debug', questions);
            r.resolve(questions);
        });
    } else {
        r.resolve([]);
    }
    return r.promise;
}

//Helper function to attach choices to particular questions
function attachChoicesToQuestions(questions, choices) {

    for (var i = 0; i < questions.length; i++) {
        for (var j = choices.length - 1; j >= 0; j--) {
            if (questions[i].QuestionSerNum === choices[j].QuestionSerNum) {
                if (!questions[i].hasOwnProperty('Choices')) {
                    questions[i].Choices = [];
                }
                var choiceCopy = {};
                choiceCopy = Object.assign(choiceCopy, choices[j]);
                questions[i].Choices.push(choiceCopy);
                // choices.splice(j, 1);
            }
        }
    }

    return questions;
}

//Attaching answers to answered questionnaires
function attachingQuestionnaireAnswers(opalDB, lang) {
    var r = q.defer();
    var patientQuestionnaires = {};
    var questionnaireSerNumArray = [];
    var rowsOfAnswers = [];
    for (var i = 0; i < opalDB.length; i++) {
        patientQuestionnaires[opalDB[i].QuestionnaireSerNum] = opalDB[i];

        if (opalDB[i].CompletedFlag == 1 || opalDB[i].CompletedFlag == '1') {
            questionnaireSerNumArray.push(opalDB[i].QuestionnaireSerNum);
        }
    }
    if (questionnaireSerNumArray.length > 0) {
        var quer = connection.query(queryAnswersPatientQuestionnaire, [[questionnaireSerNumArray]], function (err, rows, fields) {
            console.log("QUESTIONNAIRE ANSWERS======================================================", rows);

            logger.log('debug', "QUESTIONNAIRE ANSWERS======================================================\n" + JSON.stringify(rows));
            //console.log(quer.sql);
            //console.log('line 169', err);
            if (err) r.reject(err);

            var promiseArray = [];
            var languageId = 1;

            for (var i = 0; i < rows.length; i++){
                if (rows[i].languageId !== -1){
                    languageId = rows[i].languageId;
                }
                rowsOfAnswers.push(rows[i]);
                promiseArray.push(promisifyQuery(queryAnswerText, [rows[i].ID, languageId]));
            }

            q.all(promiseArray).then(function(translatedAnswerArray){

                logger.log('debug', "translatedAnswerArray: \n" + JSON.stringify(translatedAnswerArray));

                // inserting the answers according to the questionnaire
                // this is for when a question can have multiple answers
                var answersQuestionnaires = {};

                for (var i = 0; i < rowsOfAnswers.length; i++){
                    if (!answersQuestionnaires.hasOwnProperty(rows[i].QuestionnaireSerNum)){
                        answersQuestionnaires[rows[i].QuestionnaireSerNum] = [];
                    }

                    // add translated answer into answers
                    // this is for loop is for checkbox questions which can have multiple answers
                    for (var j = 0; j < translatedAnswerArray[i][0].length; j++){
                        // this is for cloning rowsOfAnswers to avoid pass by reference
                        var answerCopy = {};

                        logger.log('debug', "translatedAnswerArray next: " + JSON.stringify(translatedAnswerArray[i][0]));

                        if (translatedAnswerArray[i][0][j].hasOwnProperty('value')){
                            rowsOfAnswers[i].Answer = translatedAnswerArray[i][0][j].value;

                            if (translatedAnswerArray[i][0].length === 2){
                                logger.log('debug', "rowsOfAnswers[i].Answer: " + JSON.stringify(rowsOfAnswers[i].Answer));
                            }

                        }else{
                            rowsOfAnswers[i].Answer = null;
                        }

                        answerCopy = Object.assign(answerCopy, rowsOfAnswers[i]);
                        answersQuestionnaires[rows[i].QuestionnaireSerNum].push(answerCopy);

                        if (translatedAnswerArray[i][0].length === 2){
                            logger.log('debug', "answersQuestionnaires[rows[i].QuestionnaireSerNum]: " + JSON.stringify(answersQuestionnaires[rows[i].QuestionnaireSerNum]));
                        }
                    }
                    delete rowsOfAnswers[i].ID;
                    delete rowsOfAnswers[i].languageId;
                }

                // putting the answers into patientQuestionnaires object
                for (var i = 0; i < opalDB.length; i++) {

                    if (opalDB[i].CompletedFlag == 1 || opalDB[i].CompletedFlag == '1'){
                        patientQuestionnaires[opalDB[i].QuestionnaireSerNum].Answers = answersQuestionnaires[opalDB[i].QuestionnaireSerNum];

                        if (opalDB[i].QuestionnaireSerNum === 391){
                            logger.log('debug', "patientQuestionnaires[opalDB[i].QuestionnaireSerNum].Answers: " + JSON.stringify(patientQuestionnaires[opalDB[i].QuestionnaireSerNum].Answers));
                        }
                    }
                    //console.log(patientQuestionnaires[opalDB[i].QuestionnaireSerNum]);
                }

                r.resolve(patientQuestionnaires);

            }).catch(function(err){
                r.reject(err);
            });
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
// old
var inputAnswersQuery = "INSERT INTO `Answer`(`AnswerSerNum`, `QuestionnaireQuestionSerNum`, `Answer`, `LastUpdated`, `PatientSerNum`, `PatientQuestionnaireSerNum`) VALUES (NULL,?,?,NULL,?,?)";
var patientSerNumQuery = "SELECT PatientSerNum FROM Patient WHERE Patient.PatientId = ?;";
var inputPatientQuestionnaireQuery = "INSERT INTO `PatientQuestionnaire`(`PatientQuestionnaireSerNum`, `PatientSerNum`, `DateTimeAnswered`, `QuestionnaireSerNum`) VALUES (NULL,?,?,?)";

// new
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

exports.inputQuestionnaireAnswers = function (parameters, appVersion) {
    var r = q.defer();

    console.log("------------ in inputQuestionnaireAnswers, before doing anything --------------\n");

    var authorOfUpdate = 'QPLUS_' + appVersion;
    var patientId;

   getPatientIdInQuestionnaireDB(parameters)
       .then(function(verifiedPatientId){
           patientId = verifiedPatientId;

           console.log("------------ in inputQuestionnaireAnswers, after verifying patientID --------------\n");

           // update the status in `answerQuestionnaire` table
           return promisifyQuery(updateStatusCompletedInAnswerQuestionnaireQuery, [parameters.DateCompleted, authorOfUpdate, parameters.QuestionnaireSerNum]);
       }).then(function(){

            console.log("------------ in inputQuestionnaireAnswers, after updating status in `answerQuestionnaire` --------------\n");

           // gets the questionId, sectionId and type of question from the questionnaireQuestionSerNum of one answer, also the answerSectionId
            // transform the object parameters.Answers into an array to ensure order
           return inputAnswerSection(parameters.QuestionnaireSerNum, Object.values(parameters.Answers));
       }).then(function(formattedAnswers){

           console.log("------------ in inputQuestionnaireAnswers, after getting necessary IDs -------------- formattedAnswers: \n", formattedAnswers);

           var promiseArray = [];

           for (var i = 0; i < formattedAnswers.length; i++){
               console.log("------------ in inputQuestionnaireAnswers, sending ans to inputAnswer -------------- ansObj: \n", formattedAnswers[i]);
               promiseArray.push(inputAnswer(parameters.QuestionnaireDBSerNum, formattedAnswers[i], parameters.Language, patientId, parameters.DateCompleted, authorOfUpdate));
           }

           return q.all(promiseArray);
       }).then(function(result){
            console.log("------------ in inputQuestionnaireAnswers, after inserting answers --------------\n");

           r.resolve(result);
       }).catch(function(err){
           r.reject(err);
       });

    // getPatientSerNum(parameters.PatientId).then(function (serNum) {
    //     var sa = connection.query(inputPatientQuestionnaireQuery, [serNum, parameters.DateCompleted, parameters.QuestionnaireDBSerNum], function (err, result) {
    //         //console.log(sa.sql);
    //         if (err) r.reject(err);
    //         //console.log(result);
    //         inputAnswersHelper(result.insertId, serNum, parameters.Answers).then(function (res) {
    //             r.resolve(result.insertId);
    //         }).catch(function (err) {
    //             r.reject(err);
    //         });
    //     });
    // });
    return r.promise;
};
//
// //Get PatientSerNum for that part
// function getPatientSerNum(patientId) {
//     var r = q.defer();
//     connection.query(patientSerNumQuery, [patientId], function (err, rows, fields) {
//         if (err) r.reject(err);
//         else r.resolve(rows[0].PatientSerNum);
//     });
//     return r.promise;
// }

//Helper processes most of the work to insert query.
function inputAnswersHelper(id, patientSerNum, answers) {
    var r = q.defer();
    var arrayPromises = [];
    //console.log(answers);
    for (var i in answers) {
        var objectAnswer = answers[i].Answer;

        logger.log('debug', answers[i].Answer);

        if (answers[i].QuestionType == 'Checkbox') {
            for (var key in objectAnswer) {
                if (objectAnswer[key] !== '') {
                    arrayPromises.push(promisifyQuery(inputAnswersQuery, [answers[i].QuestionnaireQuestionSerNum, objectAnswer[key], patientSerNum, id]));
                }
            }
        } else {
            arrayPromises.push(promisifyQuery(inputAnswersQuery, [answers[i].QuestionnaireQuestionSerNum, objectAnswer, patientSerNum, id]));
        }
    }
    q.all(arrayPromises).then(function (result) {
        //console.log(result);
        r.resolve(result);
    }).catch(function (err) {
        //console.log(err);
        r.reject(err);
    });

    return r.promise;
}

/**
 * inputAnswerSection
 * @desc inputAnswerSection verifies the format of the answers input
 *      It gets the questionId, sectionId and type of question from the questionnaireQuestionSerNum of one answer
 *      It then put the sectionId into `answerSection` table if an entry does not exist yet for that section
 * @param answerQuestionnaireId: questionnaireSerNum sent from qplus
 *        answers: {array} answers where each element is an object
 * @return {promise} containing questionId, sectionId, typeId, and answerSectionID
 */
function inputAnswerSection(answerQuestionnaireId, answers){
    var r = q.defer();

    console.log("------------ in inputAnswerSection, begin --------------\n");

    var promiseArray = [];
    var sectionAndAnswerSection = {};
    var sectionArray = [];
    var promiseArray2 =[];

    console.log("------------ in inputAnswerSection, answers.length is: --------------\n", answers.length);
    console.log("------------ in inputAnswerSection, answers is: --------------\n", answers);

    for (var i = 0; i < answers.length; i++){
        // verify the input
        if (!answers[i].hasOwnProperty('QuestionnaireQuestionSerNum') || answers[i].QuestionnaireQuestionSerNum === undefined
        || !answers[i].hasOwnProperty('QuestionType') || answers[i].QuestionType === undefined
        || !answers[i].hasOwnProperty('Answer')){
            console.log("------------ in inputAnswerSection, verify input, answers[i] is: --------------\n", answers[i]);
            throw new Error('Error inputting questionnaire answers: Answers array do not have required properties');
        }

        // if the input is fine, find out the questionId, sectionId and typeId from answers[i].QuestionnaireQuestionSerNum
        promiseArray.push(promisifyQuery(getQuestionSectionInfoFromQuestionnaireQuestionSerNumQuery, [answers[i].QuestionnaireQuestionSerNum]));
    }

    console.log("------------ in inputAnswerSection, before 1st q.all --------------\n");

    q.all(promiseArray)
        .then(function(promiseArrayReturned){
            console.log("------------ in inputAnswerSection, after 1st q.all --------------\n");

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

            console.log("------------ in inputAnswerSection, before 2nd q.all, insert into `answerSection` --------------\n answers: ", answers);

            // insert all the sectionId into `answerSection` table
            return q.all(promiseArray2);

        }).then(function(promiseArrayReturned2){

            console.log("------------ in inputAnswerSection, after 2nd q.all --------------\n");

            for (var j = 0; j < sectionArray.length; j++){
                sectionAndAnswerSection[sectionArray[j]] = promiseArrayReturned2[j].insertId;
            }

            for (var i = 0; i < answers.length; i++){
                answers[i].answerSectionId = sectionAndAnswerSection[answers[i].sectionId];
            }

            console.log("------------ in inputAnswerSection, before resolve --------------answers: \n", answers);

            r.resolve(answers);

        }).catch(function(err){
            console.log("------------ in inputAnswerSection, before reject -------------- \n");

            r.reject('Error inputting questionnaire answers: ', err);

        });

    return r.promise;
}

/**
 * getPatientIdInQuestionnaireDB
 * @desc getPatientIdInQuestionnaireDB gets the patientId in the QuestionnaireDB. If parameters contain the property patientId, it also checks if both IDs match
 * @param parameters
 * @return {promise}
 */
function getPatientIdInQuestionnaireDB(parameters) {
    var r = q.defer();

    console.log("------------ in getPatientIdInQuestionnaireDB, begin --------------\n");

    var promiseArray = [];
    var hasExternalPatientId = 0;
    var patientId;

    // the existance of parameters.QuestionnaireSerNum was already checked beforehand in inputQuestionnaireAnswers
    promiseArray.push(promisifyQuery(getPatientIdFromQuestionnaireSerNumQuery, [parameters.QuestionnaireSerNum]));

    if (parameters.hasOwnProperty('PatientId') && parameters.PatientId !== undefined){
        hasExternalPatientId = 1;
        promiseArray.push(promisifyQuery(patientIdInQuestionnaireDBQuery, [parameters.PatientId]))
    }

    console.log("------------ in getPatientIdInQuestionnaireDB, before 1st q.all --------------\n");

    q.all(promiseArray)
        .then(function(promiseArrayReturn){

            console.log("------------ in getPatientIdInQuestionnaireDB, after 1st q.all returns --------------\n");

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
                    throw new Error('Error inputting questionnaire answers: the patientId given does not match to the patientId retrieved using QuestionnaireSerNum');
                }
            }

            console.log("------------ in getPatientIdInQuestionnaireDB, before resolve --------------\n");

            r.resolve(patientId);
        })
        .catch(function(err){
            r.reject('Error inputting questionnaire answers: ', err);
        });

    return r.promise;
}


var insertIntoAnswerQuery = `REPLACE INTO 
answer(questionnaireId, sectionId, questionId, typeId, answerSectionId, languageId, patientId, answered, skipped, creationDate, createdBy, lastUpdated, updatedBy)
VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);
`;
var insertTextBox = `INSERT INTO \`answerTextBox\` (\`answerId\`, \`value\`) VALUES (?, ?)`;
var insertSlider = `INSERT INTO \`answerSlider\` (\`answerId\`, \`value\`) VALUES (?, ?)`;
var insertRadioButton = `REPLACE INTO answerRadioButton (answerId, \`value\`)
VALUES (?, 
(SELECT rbOpt.ID
FROM radioButton rb, radioButtonOption rbOpt
WHERE rb.questionId = ?
 AND rbOpt.parentTableId = rb.ID
 AND rbOpt.description IN (
  SELECT contentId
  FROM dictionary
  WHERE content = ?
   AND deleted <> 1 
	AND tableId IN (12, 31, 17) -- where 12, 17, 31 are checkboxOption, labelOption, radioButtonOption tables resp., you can check in definitionTable
  )
LIMIT 1)
);`;

var insertCheckbox = `REPLACE INTO answerCheckbox (answerId, \`value\`)
VALUES (?, 
(SELECT cbOpt.ID
FROM checkbox cb, checkboxOption cbOpt
WHERE cb.questionId = ?
 AND cb.ID = cbOpt.parentTableId
 AND cbOpt.description IN (
  SELECT contentId
  FROM dictionary
  WHERE content = ?
   AND deleted <> 1 
	AND tableId IN (12, 31, 17) -- where 12, 17, 31 are checkboxOption, labelOption, radioButtonOption tables resp., you can check in definitionTable
  )
LIMIT 1)
);`;

/**
 * inputAnswer
 * @desc inputAnswer inserts into the DB the answer for a single question
 * @param questionnaireId
 * @param answer {object}
 * @param languageId
 * @param patientId
 * @param dateCompleted
 * @param updateAuthor
 * @return {promise}
 */

function inputAnswer(questionnaireId, answer, languageId, patientId, dateCompleted, updateAuthor){
    var r = q.defer();

    console.log("------------ in inputAnswer, begin --------------\n");

    var answered = 1; // default for answered is 1 unless the answer is undefined
    var skipped = 0; // there is no option on the front-end right now to skip a question
    var answerId;
    
    // in the qplus, if the answer has been chosen but not filled in, the answer is undefined. In this new version of DB, this is not answered
    if (answer.Answer === undefined){
        answered = 0;
    }

    console.log("------------ in inputAnswer, before inserting into `answer` query -------------- answer is: \n", answer);

    promisifyQuery(insertIntoAnswerQuery, [questionnaireId, answer.sectionId, answer.questionId, answer.typeId, answer.answerSectionId,
        languageId, patientId, answered, skipped, dateCompleted, updateAuthor, dateCompleted, updateAuthor])
    .then(function(result){

        console.log("------------ in inputAnswer, after inserting into `answer` query --------------\n result.insertId: ", result.insertId);

        answerId = result.insertId;

        var promiseArray = [];

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
                if (!(answer.Answer instanceof Array)){
                    throw new Error('Error inputting questionnaire answers: there is no array of answers for checkbox');
                }

                for (var i = 0; i < answer.Answer.length; i++){
                    promiseArray.push(promisifyQuery(insertCheckbox, [answerId, answer.questionId, answer.Answer[i]]));
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

        console.log("------------ in inputAnswer, after case switching and before q.all --------------\n");

        return q.all(promiseArray)
    }).then(function(result){

        console.log("------------ in inputAnswer, before resolve --------------\n");

        r.resolve(result);
    }).catch(function(err){
        r.reject('Error inputting questionnaire answers: ', err);
    });

    return r.promise;
}

//Turns a callback query function into a promise
function promisifyQuery(query, parameters) {
    var r = q.defer();
    connection.query(query, parameters, function (err, rows, fields) {
        if (err) r.reject(err);
        else r.resolve(rows);
    });
    return r.promise;
}