const {PatientTestResult} = require("../classes/patient-test-result");
const {ApiRequestHandler} = require("../../../api-request-handler");
const {Patient} = require("../../patient/patient");

class PatientTestTypesHandler extends ApiRequestHandler {
	/**
 	 * Handler for the PatientTestTypes request, gets list of tests for the patient
	 * @param {OpalRequest} requestObject
	 * @returns {Promise<{data: {patientSerNum: number, testTypes: Object}}>}
	 */
	static async handleRequest(requestObject) {
        const lastUpdated = requestObject.params.Date || 0;
		const patient = await Patient.getPatientByUsername(requestObject.meta.UserID);
		const patientTestResult = new PatientTestResult(patient);
		return {
			"data": {
				"patientSerNum": patient.patientSerNum,
				"testTypes": await patientTestResult.getTestTypes(lastUpdated)
			}
		};
	}
}
module.exports = PatientTestTypesHandler;
