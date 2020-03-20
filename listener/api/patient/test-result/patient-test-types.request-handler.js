const {PatientTests} = require("./patient-test-result");
const {ApiRequestHandler} = require("../../api-request-handler");
const {Patient} = require("../patient");

class PatientTestTypesHandler extends ApiRequestHandler {
	/**
	 * Handler for the PatientTestTypes request, gets list of tests for the patient
	 * @param {OpalRequest} requestObject
	 */
	static async handleRequest(requestObject) {
		const patient = await Patient.getPatientByUsername(requestObject.meta.UserID);
		const patientTestResult = new PatientTests(patient);
		return await patientTestResult.getTestTypes();
	}
}
module.exports = PatientTestTypesHandler.handleRequest;