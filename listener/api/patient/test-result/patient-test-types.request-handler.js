const {PatientTestResult} = require("./patient-test-result");
const {ApiRequestHandler} = require("../../api-request-handler");
const {Patient} = require("../patient");

class PatientTestTypesHandler extends ApiRequestHandler {
	/**
	 * Handler for the PatientTestTypes request, gets list of tests for the patient
	 * @param {OpalRequest} requestObject
	 */
	static async handleRequest(requestObject) {
		const patient = await Patient.getPatientByUsername(requestObject.meta.UserID);
		const patientTestResult = new PatientTestResult(patient);
		return {
			"data": {
				"patientSerNum": patient.patientSerNum,
				"testTypes": await patientTestResult.getTestTypes()
			}
		};
	}
}
module.exports = PatientTestTypesHandler.handleRequest;