const {ApiRequestHandler} = require("../../api-request-handler");
const {PatientTestResult} = require("./patient-test-result");
const {Patient} = require("../patient");

class PatientTestCollectedDatesHandler extends ApiRequestHandler {
	/**
	 * Request returns list of test dates for the patient
	 * @param {OpalRequest} requestObject OpalRequest object
	 */
	static async handleRequest(requestObject) {
		const patient = await Patient.getPatientByUsername(requestObject.meta.UserID);
		const patientTest = new PatientTestResult(patient);
		const testDates = (await patientTest.getTestDates()).map(queryRes=>queryRes.CollectedDateTime);
		return {
			"data": {
				"patientSerNum": patient.patientSerNum,
				"collectedDates": testDates
			}
		};
	}
}

module.exports = PatientTestCollectedDatesHandler.handleRequest;
