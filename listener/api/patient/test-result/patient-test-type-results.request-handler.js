const {PatientTests} = require("./patient-test-result");
const {ApiRequestHandler} = require("../../api-request-handler");
const {Patient} = require("../patient");
const {OpalResponseError} = require("../../response/response-error");
const {param} = require("express-validator");
class PatientTestTypeResultsHandler extends ApiRequestHandler {
	/**
	 * Validation of request handler
	 * @type {ValidationChain[]}
	 */
	static validators = [
		param("type", "Test type is required and must be string of length>1").isString()
			.isLength({min:1}).exists(),
	];
	/**
	 * Handler for the PatientTestTypes request, gets list of tests for the patient
	 * @param {OpalRequest} requestObject
	 */
	static async handleRequest(requestObject) {
		const errors = await this.validate(requestObject.parameters);
		if(!errors.isEmpty()){
			logger.log("debug", "Validation Error", errors);
			return new OpalResponseError(400, errors.array(), errors); // Bad request
		}
		const type = requestObject.parameters.type;
		const patient = await Patient.getPatientByUsername(requestObject.meta.UserID);
		const patientTests = new PatientTests(patient);
		return await patientTests.getTestResultsByType(type);
	}
}

module.exports = PatientTestTypeResultsHandler.handleRequest;
