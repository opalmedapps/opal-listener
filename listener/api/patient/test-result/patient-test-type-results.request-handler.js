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
		param("type", "Test type is required and must be string of length>1").isString()
			.isLength({min: 1}).exists(),
	];

	/**
	 * Handler for the PatientTestTypes request, gets list of tests for the patient
	 * @param {OpalRequest} requestObject Request coming from Firebase
	 */
	static async handleRequest(requestObject) {
		const errors = await PatientTestTypeResultsHandler.validate(requestObject.parameters);
		if (!errors.isEmpty()) {
			logger.log("debug", "Validation Error", errors);
			throw new ValidationError(errors.errors());
		}
		const type = requestObject.parameters.type;
		const patient = await Patient.getPatientByUsername(requestObject.meta.UserID);
		const patientTests = new PatientTestResult(patient);
		return {"data": await patientTests.getTestResultsByType(type)};
	}
}

module.exports = PatientTestTypeResultsHandler.handleRequest;
