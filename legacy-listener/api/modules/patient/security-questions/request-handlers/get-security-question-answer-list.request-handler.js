const {ApiRequestHandler} = require("../../../../api-request-handler");
const {Patient} = require("../../patient");
const {PatientSecurityQuestion} = require("../classes/patient-security-question");

class GetSecurityQuestionAnswerListRequestHandler extends ApiRequestHandler{
    /**
     * Handler for the SecurityQuestionAnswerList request, returns 2 lists for security questions related to a given patient
     * @param {OpalRequest} requestObject
     * @returns {Promise<{data: {patientSerNum: number, activeSecurityQuestionList: [], securityQuestionWithAnswerList: []}}>}
     */
    static async handleRequest(requestObject){
        const patient = await Patient.getPatientByUsername(requestObject.meta.UserID);
        const patientSecurityQuestion = new PatientSecurityQuestion(patient);

        let securityQuestionList;
        let securityQuestionWithAnsList;

        [securityQuestionList, securityQuestionWithAnsList] =
            await Promise.all([patientSecurityQuestion.getActiveSecurityQuestionList(), patientSecurityQuestion.getSecurityAnswerList()]);

        return {
            "data": {
                "patientSerNum": patient.patientSerNum,
                "securityQuestionWithAnswerList": securityQuestionWithAnsList,
                "activeSecurityQuestionList": securityQuestionList,
            }
        };
    }
}

module.exports = GetSecurityQuestionAnswerListRequestHandler;
