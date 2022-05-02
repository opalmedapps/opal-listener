const { ApiRequestHandler } = require('../../../api-request-handler');
const { Patient } = require('../../patient/patient');
const questionnaireQuestionnaireDB = require('../../../../questionnaires/questionnaireQuestionnaireDB');

class QuestionnaireListHandler extends ApiRequestHandler {
    /**
     * @description Returns the list of questionnaires for the given patient.
     *              If a 'Date' param is provided, only questionnaires added after this date are returned.
     * @param {OpalRequest} requestObject OpalRequest object
     */
    static async handleRequest(requestObject) {
        const lastUpdated = requestObject.params.Date ? new Date(Number(requestObject.params.Date)) : 0;
        const patient = await Patient.getPatientByUsername(requestObject.meta.UserID);
        const patientInfoSubset = {
            PatientSerNum: patient.patientSerNum,
            Language: patient.language,
        };
        return {
            data: {
                patientSerNum: patient.patientSerNum,
                questionnaireList: await questionnaireQuestionnaireDB.getQuestionnaireList(patientInfoSubset, lastUpdated),
            },
        };
    }
}

module.exports = QuestionnaireListHandler;
