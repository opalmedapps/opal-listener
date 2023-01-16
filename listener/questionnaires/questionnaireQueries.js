/*
This file stores all queries related to the questionnaire system
 */

/**
 * ==============================================
 * Queries for the OpalDB
 * ==============================================
 */

exports.getQuestionnaireInOpalDBFromSerNum = function () {
    return `SELECT
                q.QuestionnaireSerNum AS questionnaireSerNum,
                q.QuestionnaireControlSerNum AS questionnaireControlSerNum,
                q.PatientQuestionnaireDBSerNum AS answerQuestionnaireId,
                q.CompletedFlag AS completedFlag,
                q.CompletionDate AS completionDate,
                q.LastUpdated AS lastUpdated
            FROM Questionnaire q
            WHERE q.QuestionnaireSerNum = ?;`
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

exports.getQuestionnaireListQuery = function () {
    return "CALL getQuestionnaireList(?,?,?,?);";
}

exports.getQuestionnaireQuery = function () {
    return "call getQuestionnaireInfo(?,?);";
}

exports.getQuestionOptionsQuery = function () {
    return "CALL getQuestionOptions(?, ?, ?);";
}

exports.getQuestionnairePurposeQuery = function () {
    return `SELECT d.content as purpose
        FROM dictionary d, purpose p, answerQuestionnaire aq LEFT JOIN questionnaire q ON q.ID = aq.questionnaireId
            WHERE d.contentId = p.title
                AND p.ID = q.purposeId
                AND d.languageId = 2
                AND aq.ID = ?;`
}

exports.getNumberUnreadQuery = function () {
    return `SELECT COUNT(*) as numberUnread
        FROM answerQuestionnaire aq LEFT JOIN questionnaire q ON q.ID = aq.questionnaireId
            WHERE aq.status = 0
                AND q.purposeId = ?
                AND aq.patientId = (SELECT ID FROM patient WHERE externalId = ?);`
}

exports.saveAnswerQuery = function () {
    return "call saveAnswer(?,?,?,?,?,?,?,?);";
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
    return "call updateAnswerQuestionnaireStatus(?,?,?,?,?);";
}
