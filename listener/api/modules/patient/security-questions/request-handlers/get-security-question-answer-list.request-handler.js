const {ApiRequestHandler} = require("../../../../api-request-handler");
const {Patient} = require("../../patient");
const SecurityDjango = require("../../../../../security/securityDjango");

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
        let apiResponse;

        apiResponse = await SecurityDjango.getSecurityQuestionList(requestObject.meta.UserID);
        if (apiResponse.length === 0) throw "API call returned a empty list of questions for the current user";
        securityQuestionList = apiResponse.results;

        apiResponse = await SecurityDjango.getActiveSecurityQuestions();
        if (apiResponse.length === 0) throw "API call returned a empty list of all the active questions";
        activeSecurityQuestions = apiResponse.results;
        return {
            "data": {
                "patientSerNum": patient.patientSerNum,
                "securityQuestionList": securityQuestionList,
                "activeSecurityQuestions": activeSecurityQuestions,
            }
        };
    }
}

module.exports = GetSecurityQuestionAnswerListRequestHandler;
