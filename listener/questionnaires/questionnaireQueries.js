var exports = module.exports = {};

/*
This file stores all queries to questionnaireDB / questionnaireDB2019
 */

/**
 * ==============================================
 * Questionnaire version 1.5 queries
 * ==============================================
 */

/*
Get questionnaire
 */

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
exports.queryQuestions = function(){
    return "CALL queryQuestions(?);";
}

/*
legacy query:
var queryQuestionChoices = "SELECT QuestionSerNum, MCSerNum as OrderNum, MCDescription as ChoiceDescription_EN, MCDescription_FR as ChoiceDescription_FR  FROM QuestionMC WHERE QuestionSerNum IN ? UNION ALL SELECT * FROM QuestionCheckbox WHERE QuestionSerNum IN ? UNION ALL SELECT * FROM QuestionMinMax WHERE QuestionSerNum IN ? ORDER BY QuestionSerNum, OrderNum DESC";
 */
// for questionnaireDB2019:
exports.queryQuestionChoices = function(){
    return "CALL queryQuestionChoices(?);";
}

/*
legacy query:
var queryAnswersPatientQuestionnaire = "SELECT QuestionnaireQuestionSerNum, Answer.Answer, PatientQuestionnaireSerNum as PatientQuestionnaireDBSerNum FROM Answer WHERE PatientQuestionnaireSerNum IN ? ORDER BY PatientQuestionnaireDBSerNum;"
 */
// for questionnaireDB2019:
// note that this query does not take skipped answers into account since these functionnalities do not exist yet in the qplus
exports.queryAnswers = function(){
    return "CALL queryAnswers(?,?);";
}

/*
Save answers
 */

/*
Legacy queries
var inputAnswersQuery = "INSERT INTO `Answer`(`AnswerSerNum`, `QuestionnaireQuestionSerNum`, `Answer`, `LastUpdated`, `PatientSerNum`, `PatientQuestionnaireSerNum`) VALUES (NULL,?,?,NULL,?,?)";
var patientSerNumQuery = "SELECT PatientSerNum FROM Patient WHERE Patient.PatientId = ?;";
var inputPatientQuestionnaireQuery = "INSERT INTO `PatientQuestionnaire`(`PatientQuestionnaireSerNum`, `PatientSerNum`, `DateTimeAnswered`, `QuestionnaireSerNum`) VALUES (NULL,?,?,?)";
*/

// For questionnaireDB2019
exports.patientIdInQuestionnaireDBQuery = function(){
    return "SELECT ID FROM patient WHERE externalId = ?;";
}

exports.getQuestionSectionInfoFromQuestionnaireQuestionSerNumQuery = function(){
    return `SELECT qSec.questionId, qSec.sectionId, q.typeId 
FROM question q, (SELECT questionId, sectionId FROM questionSection WHERE ID = ?) qSec
WHERE q.deleted <> 1 AND q.ID = qSec.questionId
;`;
}

exports.getPatientIdFromQuestionnaireSerNumQuery = function(){
    return "SELECT patientId FROM answerQuestionnaire WHERE ID = ? AND deleted <> 1 AND \`status\` <> 2;";
}

exports.updateAnswerQuestionnaireQuery = function(){
    return "UPDATE \`answerQuestionnaire\` SET \`status\` = ?, \`updatedBy\` = ? WHERE \`ID\` = ?;";
}

exports.insertSectionIntoAnswerSectionQuery = function () {
    return "REPLACE INTO answerSection(answerQuestionnaireId, sectionId) VALUES (?, ?);";
}

exports.insertIntoAnswerQuery = function(){
    return `REPLACE INTO 
answer(questionnaireId, sectionId, questionId, typeId, answerSectionId, languageId, patientId, answered, skipped, creationDate, createdBy, lastUpdated, updatedBy)
VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);`;
}

exports.insertTextBox = function(){
    return "INSERT INTO \`answerTextBox\` (\`answerId\`, \`value\`) VALUES (?, ?)";
}

exports.insertSlider = function(){
    return "INSERT INTO \`answerSlider\` (\`answerId\`, \`value\`) VALUES (?, ?)";
}

// Answer Type ID for getAnswerTableOptionID: 1 = Checkbox, 4 = Radiobutton, 5 = Label
exports.insertRadioButton = function(){
    return "REPLACE INTO answerRadioButton (answerId, \`value\`) VALUES (?, (SELECT getAnswerTableOptionID(?,?,4)));";
}

// Answer Type ID for getAnswerTableOptionID: 1 = Checkbox, 4 = Radiobutton, 5 = Label
exports.insertCheckbox = function(){
    return "REPLACE INTO answerCheckbox (answerId, \`value\`) VALUES (?, (SELECT getAnswerTableOptionID(?,?,1)));";
}

/**
 * ==============================================
 * Questionnaire version 2 queries: April 2019
 * ==============================================
 */

exports.getQuestionnaireListQuery = function(){
    return "call getQuestionnaireList(?,?);";
}

exports.getQuestionnaireQuery = function () {
    return "call getQuestionnaireInfo(?,?);";
}

exports.getQuestionOptionsQuery = function () {
    return "CALL getQuestionOptions(?, ?, ?);";
}

exports.saveAnswerQuery = function () {
    return "call saveAnswer(?,?,?,?,?,?,?);";
}

exports.insertAnswerTextbox = function () {
    return "INSERT INTO answerTextBox (answerId, value) VALUES (?, ?)";
}

exports.insertAnswerSlider = function () {
    return "INSERT INTO \`answerSlider\` (\`answerId\`, \`value\`) VALUES (?, ?)";
}

exports.insertAnswerRadioButton = function () {
    return "INSERT INTO answerRadioButton (answerId, value) VALUES (?,?);";
}

exports.insertAnswerTime = function () {
    return "INSERT INTO answerTime (answerId, value) VALUES (?, ?)";
}

exports.insertAnswerDate = function () {
    return "INSERT INTO answerDate (answerId, value) VALUES (?, ?)";
}

exports.insertAnswerLabel = function () {
    return "INSERT INTO answerLabel (answerId, selected, posX, posY, intensity, value) VALUES ";
}

exports.insertAnswerCheckbox = function () {
    return "INSERT INTO answerCheckbox (answerId, value) VALUES ";
}

exports.updateAnswerQuestionnaireStatus = function () {
    return "call updateAnswerQuestionnaireStatus(?,?,?);";
}