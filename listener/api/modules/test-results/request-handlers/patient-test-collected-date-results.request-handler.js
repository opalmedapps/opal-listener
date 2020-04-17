const {ValidationError} = require("../../../errors/validation-error");
const {ApiRequestHandler} = require("../../../api-request-handler");
const {PatientTestResult} = require("../classes/patient-test-result");
const {Patient} = require("../../patient/patient");
const {param} = require("express-validator");
const logger = require("../../../../logs/logger");

class PatientTestCollectedDateResultsHandler extends ApiRequestHandler {
	/**
	 * Must validate the date string in the parameters is a proper date object.
	 */
	static validators = [
		param("date", "Must provide valid date parameters").exists().toDate()
	];

	/**
	 * Request returns the test dates result for the patient. 
	 * @param {OpalRequest} requestObject OpalRequest object
	 */
	static async handleRequest(requestObject) {
		const errors = await PatientTestCollectedDateResultsHandler.validate(requestObject.parameters);
		if (!errors.isEmpty()) {
			logger.log("debug", "Validation Error", errors);
			throw new ValidationError(errors.errors());
		}
		const patient = await Patient.getPatientByUsername(requestObject.meta.UserID);
		const date = requestObject.parameters.date;
		const patientTestResult = new PatientTestResult(patient);
		return {
			"data": {
				"patientSerNum": patient.patientSerNum,
				"testDate": date,
				"results": await patientTestResult.getTestResultsByDate(date)
			}
		};
	}
}

module.exports = PatientTestCollectedDateResultsHandler;
