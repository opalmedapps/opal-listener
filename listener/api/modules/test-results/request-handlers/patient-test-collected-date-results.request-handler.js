// SPDX-FileCopyrightText: Copyright 2020 Opal Health Informatics Group at the Research Institute of the McGill University Health Centre <john.kildea@mcgill.ca>
//
// SPDX-License-Identifier: AGPL-3.0-or-later

import ValidationError from '../../../errors/validation-error.js';
import ApiRequestHandler from '../../../api-request-handler.js';
import PatientTestResult from '../classes/patient-test-result.js';
import {param} from 'express-validator';
import logger from '../../../../logs/logger.js';

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

export default PatientTestCollectedDateResultsHandler;
