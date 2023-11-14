const {ApiRequestHandler} = require("../../../../api-request-handler");
const {Patient} = require("../../patient");
const SecurityDjango = require("../../../../../security/securityDjango");
const {Version} = require('../../../../../../src/utility/version');
const logger = require("../../../../../logs/logger");

class GetSecurityQuestionAnswerListRequestHandler extends ApiRequestHandler{
    /**
     * Handler for the SecurityQuestionAnswerList request, returns 2 list for security questions related to the current user
     * @param {OpalRequest} requestObject
     * @returns {Promise<{data: {patientSerNum: number, securityQuestionList: [], activeSecurityQuestions: []}}>}
     */
    static async handleRequest(requestObject){
        const patient = await Patient.getPatientByUsername(requestObject.meta.UserID);

        let activeSecurityQuestions;
        let securityQuestionList;
        let activeQuestionForLowerVersion = [];
        let securityQuestionForLowerVersion = [];
        let questionIdObj = {}

        securityQuestionList = await SecurityDjango.getSecurityQuestionList(requestObject.meta.UserID);
        if (securityQuestionList.length === 0) throw "API call returned a empty list of questions for the current user";

        activeSecurityQuestions = await SecurityDjango.getActiveSecurityQuestions(requestObject.meta.UserID);
        if (activeSecurityQuestions.length === 0) throw "API call returned a empty list of all the active questions";

        // Getting security question list format read by the app has changed after 1.12.2
        if (Version.versionLessOrEqual(requestObject.meta.AppVersion, Version.version_1_12_2)) {
            activeSecurityQuestions.forEach(questionObj => {
                activeQuestionForLowerVersion.push(
                    {
                        "SecurityQuestionSerNum": questionObj.id,
                        "QuestionText_EN": questionObj.title_en,
                        "QuestionText_FR": questionObj.title_fr,
                        "Active": 1
                    }
                );
                questionIdObj[questionObj.title_en] = questionObj.id;
                questionIdObj[questionObj.title_fr] = questionObj.id;
            });

            securityQuestionList.forEach(securityQuestionObj => {
                let questionId = -1;
                if (questionIdObj[securityQuestionObj.question] !== "undefined") questionId = questionIdObj[securityQuestionObj.question];
                securityQuestionForLowerVersion.push(
                    {
                        "SecurityAnswerSerNum": securityQuestionObj.id,
                        "QuestionText_EN": securityQuestionObj.question,
                        "QuestionText_FR": securityQuestionObj.question,
                        "Active": 1,
                        "SecurityQuestionSerNum": questionId
                    }
                );
            });
            return {
                "data": {
                    "patientSerNum": patient.patientSerNum,
                    "securityQuestionWithAnswerList": securityQuestionForLowerVersion,
                    "activeSecurityQuestionList": activeQuestionForLowerVersion,
                }
            };
        }
        else{
            return {
                "data": {
                    "patientSerNum": patient.patientSerNum,
                    "securityQuestionList": securityQuestionList,
                    "activeSecurityQuestions": activeSecurityQuestions,
                }
            };
        }
    }
}

module.exports = GetSecurityQuestionAnswerListRequestHandler;
