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
		param("testTypeSerNum", "Is required and must be numeric").exists().
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
		const testTypeSerNum = requestObject.parameters.testTypeSerNum;
		const patient = await Patient.getPatientByUsername(requestObject.meta.UserID);
		const patientTests = new PatientTestResult(patient);
		const latestPatientTestResultByType = await patientTests.getLatestTestResultByTestType(testTypeSerNum);
		if(!latestPatientTestResultByType) return {"data": null};
		const testValues = await patientTests.getTestResultValuesByTestType(testTypeSerNum);
		const hasNumericValues = testValues.every(row=>row.TestValueNumeric != null);
		let result = {
			"patientSerNum": patient.patientSerNum,
				"testTypeSerNum": testTypeSerNum,
				"hasNumericValues": hasNumericValues,
				"results": testValues
		};
		return {
			// Add the properties in latest patient test result
			"data": Object.assign(result, latestPatientTestResultByType)
		};
	}
}

module.exports = PatientTestTypeResultsHandler.handleRequest;
