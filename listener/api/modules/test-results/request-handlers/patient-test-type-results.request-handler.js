const {ValidationError} =require("../../../errors/validation-error");
const {PatientTestResult} = require("../classes/patient-test-result");
const {ApiRequestHandler} = require("../../../api-request-handler");
const {Patient} = require("../../patient/patient");
const QuestionnaireDjango = require('../../../../questionnaires/questionnaireDjango');
const {param} = require("express-validator");
const logger = require("../../../../logs/logger");

class PatientTestTypeResultsHandler extends ApiRequestHandler {
	/**
	 * This request validates and sanitizes the testTypeSerNum.
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
			logger.log("error", "Validation Error", errors);
			throw new ValidationError(errors.array());
		}
		const testTypeSerNum = requestObject.parameters.testTypeSerNum;
		const patient = await PatientTestTypeResultsHandler.getTargetPatient(requestObject);
		const patientTests = new PatientTestResult(patient);
		const latestPatientTestResultByType = await patientTests.getLatestTestResultByTestType(testTypeSerNum);
		if(!latestPatientTestResultByType) return {"data": null};

        const userId = requestObject.meta.UserID;
        const patientSerNum = patient.patientSerNum;
        const relationships = await QuestionnaireDjango.getRelationshipsWithPatient(userId, patientSerNum);
        if (relationships.length === 0) throw new Error(`Invalid request; could not find a relationship between caregiver '${userId}' and PatientSerNum ${patientSerNum}`);

        const non_interpretable_lab_result_delay = relationships.map(relationship => {
            return relationship.non_interpretable_lab_result_delay;
        })[0];
        const interpretable_lab_result_delay = relationships.map(relationship => {
            return relationship.interpretable_lab_result_delay;
        })[0];
		const testValues = await patientTests.getTestResultValuesByTestType(testTypeSerNum);
		const hasNumericValues = testValues.every(row=>row.testValueNumeric != null);
		let result = {
			"patientSerNum": patient.patientSerNum,
			"testTypeSerNum": testTypeSerNum,
			"hasNumericValues": hasNumericValues,
			"results": testValues,
            "non_interpretable_lab_result_delay": non_interpretable_lab_result_delay,
            "interpretable_lab_result_delay": interpretable_lab_result_delay
		};
		return {
			// Add the properties in latest patient test result
			"data": Object.assign(result, latestPatientTestResultByType)
		};
	}
}

module.exports = PatientTestTypeResultsHandler;
