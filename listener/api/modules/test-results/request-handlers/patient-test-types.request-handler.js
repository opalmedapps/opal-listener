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
		const lastUpdated = requestObject.params.Date ? new Date(Number(requestObject.params.Date)) : 0;
		const patient = await PatientTestTypesHandler.getTargetPatient(requestObject);
		const patientTestResult = new PatientTestResult(patient);
		return {
			"data": {
				"patientSerNum": patient.patientSerNum,
				"testTypes": await patientTestResult.getTestTypes(requestObject.meta.UserID, lastUpdated)
			}
		};
	}
}
module.exports = PatientTestTypesHandler;
