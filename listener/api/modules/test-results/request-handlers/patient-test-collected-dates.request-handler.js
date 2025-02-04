// SPDX-FileCopyrightText: Copyright 2020 Opal Health Informatics Group at the Research Institute of the McGill University Health Centre <john.kildea@mcgill.ca>
//
// SPDX-License-Identifier: AGPL-3.0-or-later

const {ApiRequestHandler} = require("../../../api-request-handler");
const {PatientTestResult} = require("../classes/patient-test-result");
const {Patient} = require("../../patient/patient");

class PatientTestCollectedDatesHandler extends ApiRequestHandler {
	/**
	 * Request returns list of test dates for the patient
	 * @param {OpalRequest} requestObject OpalRequest object
	 */
	static async handleRequest(requestObject) {
		const lastUpdated = requestObject.params.Date ? new Date(Number(requestObject.params.Date)) : 0;
		const patient = await PatientTestCollectedDatesHandler.getTargetPatient(requestObject);
		const userId = requestObject.meta.UserID;
		const patientTest = new PatientTestResult(patient);
		const testDates = (
			await patientTest.getTestDates(userId, lastUpdated)
		).map(queryRes => ({
			"collectedDateTime": queryRes.collectedDateTime,
			"readStatus": queryRes.readStatus
		}));

		return {
			"data": {
				"patientSerNum": patient.patientSerNum,
				"collectedDates": testDates
			}
		};
	}
}

module.exports = PatientTestCollectedDatesHandler;
