const {ApiRequestHandler} = require("../../api-request-handler");
const {PatientTests} = require("./patient-test-result");
const {Patient} = require("../patient");

class PatientTestDatesHandler extends ApiRequestHandler {
	/**
	 * Request returns list of test dates for the patient
	 * @param {OpalRequest} requestObject OpalRequest object
	 */
	static async handleRequest(requestObject) {
		const patient = await Patient.getPatientByUsername(requestObject.meta.UserID);
		const patientTest = new PatientTests(patient);
		return await patientTest.getTestDates();
	}
}

module.exports = PatientTestDatesHandler.handleRequest;
