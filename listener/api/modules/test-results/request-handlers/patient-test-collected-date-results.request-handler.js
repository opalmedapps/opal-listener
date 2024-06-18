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
			logger.log("error", "Validation Error", errors);
			throw new ValidationError(errors.errors);
		}
		const patient = await PatientTestCollectedDateResultsHandler.getTargetPatient(requestObject);
		const date = requestObject.parameters.date;
		const userId = requestObject.meta.UserID;
		const patientTestResult = new PatientTestResult(patient);
		const testResults = await patientTestResult.getTestResultsByDate(userId, date);
		let testSerNums = [];
		testResults.forEach((test) => testSerNums.push(test['patientTestResultSerNum']));
		await patientTestResult.markTestResultsAsRead(userId, testSerNums);

		return {
			"data": {
				"patientSerNum": patient.patientSerNum,
				"testDate": date,
				"results": testResults
			}
		};
	}
}

module.exports = PatientTestCollectedDateResultsHandler;
