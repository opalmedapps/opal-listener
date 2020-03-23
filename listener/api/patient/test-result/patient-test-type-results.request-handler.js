const {ValidationError} =require("../../errors/validation-error");
const {PatientTestResult} = require("./patient-test-result");
const {ApiRequestHandler} = require("../../api-request-handler");
const {Patient} = require("../patient");
const {param} = require("express-validator");
const logger = require("./../../../logs/logger");

class PatientTestTypeResultsHandler extends ApiRequestHandler {
	/**
	 * Array parameters specifies the validation of fields for a given request.
	 * @type {ValidationChain[]} ValidationChain in the express-validator class
	 */
	static validators = [
		param("testTypeId", "Is required and must be numeric").exists().
		isNumeric(),
	];

	/**
	 * Handler for the PatientTestTypes request, gets list of tests for the patient
	 * @param {OpalRequest} requestObject Request coming from Firebase
	 */
	static async handleRequest(requestObject) {
		const errors = await PatientTestTypeResultsHandler.validate(requestObject.parameters);
		if (!errors.isEmpty()) {
			logger.log("debug", "Validation Error", errors);
			throw new ValidationError(errors.array());
		}
		const testTypeId = requestObject.parameters.testTypeId;
		const patient = await Patient.getPatientByUsername(requestObject.meta.UserID);
		const patientTests = new PatientTestResult(patient);
		const queryResults = await patientTests.getTestResultsByType(testTypeId);
		const hasNumericValues = queryResults.every(row=>row.TestValueNumeric != null);
		return {
			"data": {
				"patientSerNum": patient.patientSerNum,
				"testTypeId": testTypeId,
				"hasNumericValues": hasNumericValues,
				"results": queryResults
			}
		};
	}
}

module.exports = PatientTestTypeResultsHandler.handleRequest;
