const {OpalResponseError} = require("../../response/response-error");
const {ApiRequestHandler} = require("../../api-request-handler");
const {PatientTests} = require("./patient-tests");
const {Patient} = require("../patient");
const {param} = require("express-validator");

class PatientTestDateResultsHandler extends ApiRequestHandler {
	static validators = [
		param("date", "Must provide valid date parameters").toDate().exists()
	];
	/**
	 * Request returns list of test dates for the patient
	 * @param {OpalRequest} requestObject OpalRequest object
	 */
	static async handleRequest(requestObject) {
		const errors = this.validate(requestObject.parameters);
		if(!errors.isEmpty()){
			logger.log("debug", "Validation Error", errors);
			return new OpalResponseError(400, errors.array(), errors); // Bad request
		}
		const patient = await Patient.getPatientByUsername(requestObject.meta.UserID);
		const date = requestObject.parameters.date;
		const patientTestResult = new PatientTests(patient);
		return await patientTestResult.getTestResultsByDate(date);
	}
}

module.exports = PatientTestDateResultsHandler.handleRequest;
