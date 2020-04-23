var exports = module.exports = {};

/*
This file stores all queries related to the questionnaire system
 */

/**
 * ==============================================
 * Queries for the OpalDB
 * ==============================================
 */

exports.getPatientSerNumAndLanguage = function()
{
    return "SELECT Patient.PatientSerNum, Patient.`Language` FROM Patient, Users WHERE Patient.PatientSerNum = Users.UserTypeSerNum && Users.Username = ?;";
};

exports.updateQuestionnaireStatus = function () {
    return "UPDATE Questionnaire SET CompletedFlag= ?, CompletionDate= CURRENT_TIMESTAMP WHERE PatientQuestionnaireDBSerNum = ?;";
};


/**
 * ==============================================
 * Queries for the questionnaireDB2019
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
    return "INSERT INTO answerSlider (answerId, value) VALUES (?, ?)";
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