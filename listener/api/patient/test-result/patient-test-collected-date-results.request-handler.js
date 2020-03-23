const {ValidationError} = require("../../errors/validation-error");
const {ApiRequestHandler} = require("../../api-request-handler");
const {PatientTestResult} = require("./patient-test-result");
const {Patient} = require("../patient");
const {param} = require("express-validator");
const logger = require("./../../../logs/logger");

class PatientTestCollectedDateResultsHandler extends ApiRequestHandler {
	static validators = [
		param("date", "Must provide valid date parameters").toDate().exists()
	];

	/**
	 * Request returns list of test dates for the patient
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

module.exports = PatientTestCollectedDateResultsHandler.handleRequest;
