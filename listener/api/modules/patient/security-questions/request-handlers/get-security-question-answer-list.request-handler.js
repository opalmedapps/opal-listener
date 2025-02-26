const {ApiRequestHandler} = require("../../../../api-request-handler");
const {Patient} = require("../../patient");
const SecurityDjango = require("../../../../../security/securityDjango");

class GetSecurityQuestionAnswerListRequestHandler extends ApiRequestHandler{
    /**
     * Handler for the SecurityQuestionAnswerList request, returns 1 list for security questions related to a given patient
     * @param {OpalRequest} requestObject
     * @returns {Promise<{data: {patientSerNum: number, securityQuestionList: []}}>}
     */
    static async handleRequest(requestObject){
        const patient = await Patient.getPatientByUsername(requestObject.meta.UserID);

        let securityQuestionList;
        let apiResponse;

        apiResponse = await SecurityDjango.getSecurityQuestionList(requestObject.meta.UserID);
        if (apiResponse.length === 0) throw "API call returned a empty list of questions";
        securityQuestionList = apiResponse.results;
        return {
            "data": {
                "patientSerNum": patient.patientSerNum,
                "securityQuestionList": securityQuestionList,
            }
        };
    }
}

module.exports = GetSecurityQuestionAnswerListRequestHandler;
