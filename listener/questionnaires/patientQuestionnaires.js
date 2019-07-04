var exports = module.exports = {};
var mysql = require('mysql');
var q = require('q');
var credentials = require('./../config.json');
const logger            = require('./../logs/logger');

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
var sqlConfig={
  host:credentials.HOST,
  user:credentials.MYSQL_USERNAME,
  password:credentials.MYSQL_PASSWORD,
  database:credentials.MYSQL_DATABASE_QUESTIONNAIRE,
  dateStrings:true,
  port: credentials.MYSQL_DATABASE_PORT
};
/*
*Re-connecting the sql database, NodeJS has problems and disconnects if inactive,
The handleDisconnect deals with that
*/
var connection = mysql.createConnection(sqlConfig);

function handleDisconnect(myconnection) {
  myconnection.on('error', function(err) {
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

var queryAnswersPatientQuestionnaire = "SELECT QuestionnaireQuestionSerNum, Answer.Answer, PatientQuestionnaireSerNum as PatientQuestionnaireDBSerNum FROM Answer WHERE PatientQuestionnaireSerNum IN ? ORDER BY PatientQuestionnaireDBSerNum;"


/*SELECT QuestionnaireQuestionSerNum,  GROUP_CONCAT(Answer SEPARATOR ', ') as Answer, PatientQuestionnaireSerNum as PatientQuestionnaireDBSerNum FROM Answer WHERE PatientQuestionnaireSerNum IN ? GROUP BY QuestionnaireQuestionSerNum ORDER BY PatientQuestionnaireDBSerNum;"*/
exports.getPatientQuestionnaires = function (patientId, lang) {
  return new Promise(((resolve, reject) => {

      // console.log("\n******** in getPatientQuestionnaires, before queryPatientQuestionnaireInfo: ***********\n", patientId[0].PatientId);

      connection.query(queryPatientQuestionnaireInfo, [patientId[0].PatientId], function(err, rows, fields){
          if(rows.length!== 0) {
              // console.log("\n******** in getPatientQuestionnaires, after queryPatientQuestionnaireInfo: ***********\n", rows);

              let questionnaireDBSerNumArray = getQuestionnaireDBSerNums(rows);

              console.log("\n******** in getPatientQuestionnaires, before queryQuestions: ***********\n", questionnaireDBSerNumArray);

              connection.query(queryQuestions, [[questionnaireDBSerNumArray]], function(err, questions, fields){
                  if(err) reject(err);

                  console.log("\n******** in getPatientQuestionnaires, after queryQuestions: ***********\n", questions);

                  let questionsOrdered = setQuestionOrder(questions);

                  console.log("\n******** in getPatientQuestionnaires, after ordering questions: ***********\n", questionsOrdered);

                  getQuestionChoices(questionsOrdered).then(function(questionsChoices){

                      // console.log("\n******** in getPatientQuestionnaires, after getQuestionChoices: ***********\n", questionsChoices);

                      let questionnaires = prepareQuestionnaireObject(questionsChoices,rows);
                      let patientQuestionnaires = {};

                      let languageInDB;
                      if (lang === 'EN'){
                          languageInDB = 2;
                      }else{
                          // default is French
                          languageInDB = 1;
                      }

                      attachingQuestionnaireAnswers(rows, languageInDB).then(function(paQuestionnaires) {
                          patientQuestionnaires = paQuestionnaires;
                          resolve({'Questionnaires':questionnaires, 'PatientQuestionnaires':patientQuestionnaires});
                      }).catch(function(error) {
                          reject(error);
                      });
                  }).catch(function(err){
                      reject(err);
                  })
              });
          }else{
              resolve([]);
          }
      });
  }));
};

//Formats questionnaire object to be ready for the app.
function prepareQuestionnaireObject(questionnaires, opalDB)
{
  var questionnairesObject = {};
  for(var i = 0;i<questionnaires.length;i++)
  {
    var questionnaireSerNum = questionnaires[i].QuestionnaireDBSerNum;
    if(!questionnairesObject.hasOwnProperty(questionnaires[i].QuestionnaireDBSerNum))
    {
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
		questionnairesObject[questionnaireSerNum].Questions[questionnaires[i].QuestionnaireQuestionSerNum]=questionnaires[i];
    }else{
		delete questionnaires[i].QuestionnaireName;
		delete questionnaires[i].QuestionnaireDBSerNum;
		questionnairesObject[questionnaireSerNum].Questions[questionnaires[i].QuestionnaireQuestionSerNum]=questionnaires[i];
    }
  }

  return questionnairesObject;
}

// from section order and questions' order inside that section, transform the data into a single ordering of questions
// TODO: this needs testing by having multiple sections for 1 questionnaire
function setQuestionOrder(questions){

    console.log('******** in setQuestionsOrder *************', questions);
    var numberOfQuestionsInPrevSections = {};
    var currSecOrder = 0;
    var thereIsMoreSec = 1;

    while (thereIsMoreSec){

        thereIsMoreSec = 0;

        var numberOfQuestionsInThisSection = {};

        for (var i = 0; i < questions.length; i++){

            // set up numberOfQuestionsInThisSection and numberOfQuestionsInPrevSections
            // one entry in numberOfQuestionsInThisSection and numberOfQuestionsInPrevSections for one questionnaire
            if(!numberOfQuestionsInThisSection.hasOwnProperty(questions[i].QuestionnaireDBSerNum)){
                numberOfQuestionsInThisSection[questions[i].QuestionnaireDBSerNum] = 0;
            }

            if(!numberOfQuestionsInPrevSections.hasOwnProperty(questions[i].QuestionnaireDBSerNum)){
                numberOfQuestionsInPrevSections[questions[i].QuestionnaireDBSerNum] = 0;
            }

            // if this question has already the right orderNum then skip this question
            if (questions[i].hasOwnProperty('OrderNum')){
                continue;
            }

            // if this question is in the current section level,
            // then we adjust its orderNum according to (how many questions are there in the previous sections + what is its order in the current section)
            if (questions[i].secOrder == currSecOrder){
                questions[i].OrderNum = questions[i].qOrder + numberOfQuestionsInPrevSections[questions[i].QuestionnaireDBSerNum];

                // there is one more question dealt with in this section level for this questionnaire
                numberOfQuestionsInThisSection[questions[i].QuestionnaireDBSerNum]++;

            }else if (questions[i].secOrder > currSecOrder){
                // this question belongs to sections after the current section level, need another loop
                thereIsMoreSec = 1;
            }
        }

        // increment the section level
        currSecOrder ++;

        // this is the end of this section level, we add the number of questions in this section level to the previous total
        for (var k in Object.keys(numberOfQuestionsInThisSection)){
            if (numberOfQuestionsInPrevSections.hasOwnProperty(k)){
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
function getQuestionChoices(rows)
{
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
function attachChoicesToQuestions(questions,choices)
{

  for (var i = 0; i < questions.length; i++) {
    for (var j = choices.length - 1; j >= 0; j--) {
      if(questions[i].QuestionSerNum == choices[j].QuestionSerNum)
      {
        if(!questions[i].hasOwnProperty('Choices'))
        {
          questions[i].Choices = [];
        }
        questions[i].Choices.push(choices[j]);
        choices.splice(j,1);
      }
    };
  };
  return questions;
}

//Attaching answers to answered questionnaires
function attachingQuestionnaireAnswers(opalDB, lang)
{
  var r = q.defer();
  var patientQuestionnaires = {};
  var patientQuestionnaireSerNumArray = [];
  for (var i = 0; i < opalDB.length; i++) {
    patientQuestionnaires[opalDB[i].QuestionnaireSerNum] = opalDB[i];
    if(opalDB[i].CompletedFlag == 1 || opalDB[i].CompletedFlag == '1')
    {

      patientQuestionnaireSerNumArray.push(opalDB[i].PatientQuestionnaireDBSerNum);
    }
  }
  if(patientQuestionnaireSerNumArray.length>0)
  {
    var quer = connection.query(queryAnswersPatientQuestionnaire, [[patientQuestionnaireSerNumArray]],function(err, rows, fields)
    {
      //console.log("QUESTIONNAIRE ANSWERS======================================================", rows);
      //console.log(quer.sql);
      //console.log('line 169', err);
      if(err) r.reject(err);
      var answersQuestionnaires = {};
      for (var i = 0; rows && i < rows.length; i++) {
        if(!answersQuestionnaires.hasOwnProperty(rows[i].PatientQuestionnaireDBSerNum))answersQuestionnaires[rows[i].PatientQuestionnaireDBSerNum] = [];
        answersQuestionnaires[rows[i].PatientQuestionnaireDBSerNum].push(rows[i]);
      }
      for (var i = 0; i < opalDB.length; i++) {

        if(opalDB[i].CompletedFlag == 1 || opalDB[i].CompletedFlag == '1') patientQuestionnaires[opalDB[i].QuestionnaireSerNum].Answers = answersQuestionnaires[opalDB[i].PatientQuestionnaireDBSerNum];
        //console.log(patientQuestionnaires[opalDB[i].QuestionnaireSerNum]);
      }

      r.resolve(patientQuestionnaires);

    });
  }else{
    r.resolve(patientQuestionnaires);
  }
  return r.promise;

}
//Query answers table
function getAnswersQuestionnaires()
{
  connection.query(getAnswersQuery, [])
}
/**
* Inserting questionnaire answers
*
**/
var inputAnswersQuery = "INSERT INTO `Answer`(`AnswerSerNum`, `QuestionnaireQuestionSerNum`, `Answer`, `LastUpdated`, `PatientSerNum`, `PatientQuestionnaireSerNum`) VALUES (NULL,?,?,NULL,?,?)"
var patientSerNumQuery = "SELECT PatientSerNum FROM Patient WHERE Patient.PatientId = ?;"
var inputPatientQuestionnaireQuery = "INSERT INTO `PatientQuestionnaire`(`PatientQuestionnaireSerNum`, `PatientSerNum`, `DateTimeAnswered`, `QuestionnaireSerNum`) VALUES (NULL,?,?,?)"
exports.inputQuestionnaireAnswers = function(parameters)
{
  var r = q.defer();
  getPatientSerNum(parameters.PatientId).then(function(serNum){
    var sa=connection.query(inputPatientQuestionnaireQuery,[serNum, parameters.DateCompleted, parameters.QuestionnaireDBSerNum],function(err,result)
    {
      //console.log(sa.sql);
      if(err)r.reject(err);
      //console.log(result);
      inputAnswersHelper(result.insertId,serNum, parameters.Answers).then(function(res){
        r.resolve(result.insertId);
      }).catch(function(err){
        r.reject(err);
      });
    });
  });
  return r.promise;
};
//Get PatientSerNum for that part
function getPatientSerNum(patientId)
{
  var r = q.defer();
  connection.query(patientSerNumQuery, [patientId],function(err,rows,fields)
  {
    if(err) r.reject(err);
    else r.resolve(rows[0].PatientSerNum);
  });
  return r.promise;
}
//Helper processes most of the work to insert query.
function inputAnswersHelper(id,patientSerNum, answers)
{
  var r = q.defer();
  var arrayPromises = [];
  //console.log(answers);
  for (var i in answers) {
    var objectAnswer = answers[i].Answer;

    logger.log('debug', answers[i].Answer);

    if(answers[i].QuestionType == 'Checkbox')
    {
      for(var key in objectAnswer)
      {
        if(objectAnswer[key]!=='')
        {
          arrayPromises.push(promisifyQuery(inputAnswersQuery, [answers[i].QuestionnaireQuestionSerNum,objectAnswer[key], patientSerNum,id]));
        }
      }
    }else{
      arrayPromises.push(promisifyQuery(inputAnswersQuery, [answers[i].QuestionnaireQuestionSerNum,objectAnswer, patientSerNum,id]));
    }
  }
  q.all(arrayPromises).then(function(result)
  {
    //console.log(result);
    r.resolve(result);
  }).catch(function(err){
    //console.log(err);
    r.reject(err);
  });

  return r.promise;
}
//Turns a callback query function into a promise
function promisifyQuery(query, parameters)
{
  var r = q.defer();
  connection.query(query,parameters,function(err,rows,fields)
  {
    if(err) r.reject(err);
    else r.resolve(rows);
  });
  return r.promise;
}