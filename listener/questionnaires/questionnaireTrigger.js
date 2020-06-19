/*
This file is created for temporary use. It should NOT be merged into production.
 */

var exports = module.exports = {};
const questionnaires = require('./questionnaireQuestionnaireDB.js');
const sqlInterface = require('./../api/sqlInterface.js');
const moment = require("moment");

exports.checkTrigger = checkTrigger;


function checkTrigger(opalPatientInfo, answerQuestionnaire_Id) {
    console.log("\n-----------in check trigger");

    /*
    Local: Opal feedback questionnaire 1st question > 3
    const triggerJsonRules = {
        "and": [
            {"==": [{"var": "section_id"}, 19]},
            {"==": [{"var": "question_id"}, 853]},
            {"==": [{"var": "skipped"}, 0]},
            {">": [{"var": "answer_value"}, 3]}
        ]
    };
    */

    // ESAS wellbeing < 5
    const triggerJsonRules = {
        "and": [
            {"==": [{"var": "section_id"}, 12]},
            {"==": [{"var": "question_id"}, 799]},
            {"==": [{"var": "skipped"}, 0]},
            {"<": [{"var": "answer_value"}, 5]}
        ]
    };

    questionnaires.getQuestionnaire(opalPatientInfo, answerQuestionnaire_Id)
        .then(function (questionnaireWithAnswer) {
            console.log("\n-----------in check trigger, got questionnaire:", questionnaireWithAnswer);

            let shouldTrigger = false;
            // const fakeAnswer =  {"questionnairePatientRelSerNum": 441,
            //     "section_id": 19,
            //     "answer_id": 1867,
            //     "question_id": 853,
            //     "type_id": 2,
            //     "answered": 1,
            //     "skipped": 0,
            //     "created": "2020-06-18 18:38:53",
            //     "last_updated": "2020-06-18 18:38:53",
            //     "answer_language_id": 2,
            //     "questionSection_id": 150,
            //     "answer_value": "5",
            //     "answer_option_text": -1,
            //     "intensity": -1,
            //     "posX": -1,
            //     "posY": -1,
            //     "selected": -1
            // };

            // this is bad... but it will not be used for production
            for (var sec_i = 0; sec_i < questionnaireWithAnswer.sections.length; sec_i++){
                let questionsArray =  questionnaireWithAnswer.sections[sec_i].questions;

                console.log("\n-----------in check trigger, section:", sec_i);


                for (var q_i = 0; q_i < questionsArray.length; q_i++) {
                    console.log("\n-----------in check trigger, question:", q_i);
                    console.log("\n-----------in check trigger, question:", questionsArray[q_i]);

                    let answersArray = questionsArray[q_i].patient_answer.answer;

                    for (var a_i = 0; a_i < answersArray.length; a_i++) {
                        let answer = answersArray[a_i];
                        console.log("\n-----------in check trigger, answer is:", answer);

                        if (testTrigger(answer)) {
                            console.log("\n-----------in check trigger, jsonLogic applied");
                            shouldTrigger = true;
                            q_i = questionsArray.length;
                            sec_i = questionnaireWithAnswer.sections.length;
                            break;
                        }

                        console.log("\n-----------in check trigger, jsonLogic does not apply");
                    }
                }
            }

            if (shouldTrigger) {
                console.log("\n-----------in check trigger, should trigger:");

                return triggerQuestionnaire(-1, opalPatientInfo.PatientSerNum);
            }

            console.log("\n-----------in check trigger, should not trigger");
            Promise.resolve("Questionnaire not send");
        })
        .then(function(response){
            Promise.resolve(response);
        })
        .catch(function(err){
            Promise.reject(err);
        })
}

const insertFilterQuery =
    `INSERT INTO Filters (ControlTable, ControlTableSerNum, FilterType, FilterId, DateAdded) VALUES (?, ?, ?, ?, ?);`;

const checkPublishFlagQuery = `SELECT qc.PublishFlag FROM QuestionnaireControl qc WHERE qc.QuestionnaireControlSerNum = ?;`;
const updatePublishFlagQuery = `UPDATE questionnairecontrol SET PublishFlag='1' WHERE  QuestionnaireControlSerNum=?;`;
const insertQuestionnaireQuery = `INSERT INTO Questionnaire (PatientSerNum,QuestionnaireControlSerNum,DateAdded) VALUES (?, ?, ?);`;

function triggerQuestionnaire (questionnaireId, patientSerNum){
    const questionnaireControlSerNumToSent = 11; // 11 for local, 7 for staging
    const controlTable = 'LegacyQuestionnaireControl';
    const filterType = 'Patient'
    let publishFlag = 0;

    console.log("\n-----------in trigger questionnaire, sending controlSerNum:", questionnaireControlSerNumToSent);

    // check publish flag of that questionnaire
    return sqlInterface.runSqlQuery(checkPublishFlagQuery, [questionnaireControlSerNumToSent])
        .then(function(result){
            publishFlag = result[0].PublishFlag;

            console.log("\n-----------in trigger questionnaire, found publish flag =", publishFlag);

            return sqlInterface.runSqlQuery(insertQuestionnaireQuery,
                [patientSerNum, questionnaireControlSerNumToSent, moment(Date.now()).format("YYYY-MM-DD HH:mm:ss")]);
        })
        .then(function(response){
            console.log("\n-----------in trigger questionnaire, inserted into the questionnaire table, response:", response);

            if (!publishFlag) {
                return sqlInterface.runSqlQuery(updatePublishFlagQuery, [questionnaireControlSerNumToSent]);
            }
            return Promise.resolve("Questionnaire sent");
        })
        .then(function(response){
            console.log("\n-----------in trigger questionnaire, updated the publish flag, response:", response);

            return Promise.resolve("Questionnaire sent");
        })
        .catch(function(err){
            return Promise.reject("Questionnaire failed to be send", err);
        });
}

function testTrigger(answer){
    // staging
    // ESAS wellbeing < 5 or test radio button 1st question = yes
    // return (answer.section_id === 12 && answer.question_id === 799 && answer.skipped === 0 && answer.answer_value < 5) ||
    //     (answer.section_id === 43 && answer.question_id === 862 && answer.skipped === 0 && answer.answer_value === 25);

    // local
    return answer.section_id === 19 && answer.question_id === 853 && answer.skipped === 0 && answer.answer_value > 3;
}