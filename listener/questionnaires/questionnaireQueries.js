// SPDX-FileCopyrightText: Copyright 2020 Opal Health Informatics Group at the Research Institute of the McGill University Health Centre <john.kildea@mcgill.ca>
//
// SPDX-License-Identifier: AGPL-3.0-or-later

/*
This file stores all queries related to the questionnaire system
 */

/**
 * ==============================================
 * Queries for the OpalDB
 * ==============================================
 */
const queries = {};

/**
 * @description Query that looks up the answerQuestionnaireId corresponding to a given QuestionnaireSerNum.
 * @returns {string} The query.
 */
queries.getAnswerQuestionnaireIdFromSerNum = () => {
    return `SELECT q.PatientQuestionnaireDBSerNum AS answerQuestionnaireId
            FROM Questionnaire q
            WHERE q.QuestionnaireSerNum = ?
            ;
    `
};

queries.updateQuestionnaireStatus = function () {
    return "UPDATE Questionnaire SET CompletedFlag= ?, CompletionDate= CURRENT_TIMESTAMP WHERE PatientQuestionnaireDBSerNum = ?;";
};

/**
 * ==============================================
 * Queries for the questionnaireDB2019
 * Questionnaire version 2 queries: April 2019
 * ==============================================
 */

queries.getQuestionnaireListQuery = function () {
    return "CALL getQuestionnaireList(?,?,?,?);";
}

queries.getQuestionnaireQuery = function () {
    return "call getQuestionnaireInfo(?,?);";
}

queries.getQuestionOptionsQuery = function () {
    return "CALL getQuestionOptions(?, ?, ?);";
}

queries.getQuestionnairePurposeQuery = function () {
    return `SELECT d.content as purpose
        FROM dictionary d, purpose p, answerQuestionnaire aq LEFT JOIN questionnaire q ON q.ID = aq.questionnaireId
            WHERE d.contentId = p.title
                AND p.ID = q.purposeId
                AND d.languageId = 2
                AND aq.ID = ?;`
}

queries.saveAnswerQuery = function () {
    return "call saveAnswer(?,?,?,?,?,?,?,?);";
}

queries.insertAnswerTextbox = function () {
    return "INSERT INTO answerTextBox (answerId, value) VALUES (?, ?)";
}

queries.insertAnswerSlider = function () {
    return "INSERT INTO answerSlider (answerId, value) VALUES (?, ?)";
}

queries.insertAnswerRadioButton = function () {
    return "INSERT INTO answerRadioButton (answerId, value) VALUES (?,?);";
}

queries.insertAnswerTime = function () {
    return "INSERT INTO answerTime (answerId, value) VALUES (?, ?)";
}

queries.insertAnswerDate = function () {
    return "INSERT INTO answerDate (answerId, value) VALUES (?, ?)";
}

queries.insertAnswerLabel = function () {
    return "INSERT INTO answerLabel (answerId, selected, posX, posY, intensity, value) VALUES ";
}

queries.insertAnswerCheckbox = function () {
    return "INSERT INTO answerCheckbox (answerId, value) VALUES ";
}

queries.updateAnswerQuestionnaireStatus = function () {
    return "call updateAnswerQuestionnaireStatus(?,?,?,?,?);";
}

queries.getAnswerQuestionnaireRespondent = function () {
    return "SELECT respondentUsername FROM answerQuestionnaire WHERE ID = ?;";
}

export default queries
