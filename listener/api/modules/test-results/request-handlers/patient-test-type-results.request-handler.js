// SPDX-FileCopyrightText: Copyright 2020 Opal Health Informatics Group at the Research Institute of the McGill University Health Centre <john.kildea@mcgill.ca>
//
// SPDX-License-Identifier: AGPL-3.0-or-later

import ApiRequestHandler from '../../../api-request-handler.js';
import logger from '../../../../logs/logger.js';
import {param} from 'express-validator';
import PatientTestResult from '../classes/patient-test-result.js';
import ValidationError from '../../../errors/validation-error.js';

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
		const userId = requestObject.meta.UserID;
		const latestPatientTestResultByType = await patientTests.getLatestTestResultByTestType(userId, testTypeSerNum);
		if(!latestPatientTestResultByType) return {"data": null};
		const testValues = await patientTests.getTestResultValuesByTestType(testTypeSerNum);
		const hasNumericValues = testValues.every(row=>row.testValueNumeric != null);
		let result = {
			"patientSerNum": patient.patientSerNum,
			"testTypeSerNum": testTypeSerNum,
			"hasNumericValues": hasNumericValues,
			"results": testValues
		};

		let testSerNums = [];
		testValues.forEach((test) => testSerNums.push(test['patientTestResultSerNum']));
		await patientTests.markTestResultsAsRead(userId, testSerNums);
		return {
			// Add the properties in latest patient test result
			"data": Object.assign(result, latestPatientTestResultByType)
		};
	}
}

export default PatientTestTypeResultsHandler;
