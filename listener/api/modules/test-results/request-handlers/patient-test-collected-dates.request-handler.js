const {ApiRequestHandler} = require("../../../api-request-handler");
const {PatientTestResult} = require("../classes/patient-test-result");
const {Patient} = require("../../patient/patient");

class PatientTestCollectedDatesHandler extends ApiRequestHandler {
	/**
	 * Request returns list of test dates for the patient
	 * @param {OpalRequest} requestObject OpalRequest object
	 */
	static async handleRequest(requestObject) {
        const lastUpdated = requestObject.params.Date || 0;
		const patient = await Patient.getPatientByUsername(requestObject.meta.UserID);
		const patientTest = new PatientTestResult(patient);
		const testDates = (await patientTest.getTestDates(lastUpdated)).map(queryRes=>queryRes.collectedDateTime);
		return {
			"data": {
				"patientSerNum": patient.patientSerNum,
				"collectedDates": testDates
			}
		};
	}
}

module.exports = PatientTestCollectedDatesHandler;
