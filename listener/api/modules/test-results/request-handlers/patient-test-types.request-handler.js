// SPDX-FileCopyrightText: Copyright 2020 Opal Health Informatics Group at the Research Institute of the McGill University Health Centre <john.kildea@mcgill.ca>
//
// SPDX-License-Identifier: AGPL-3.0-or-later

import PatientTestResult from '../classes/patient-test-result.js';
import ApiRequestHandler from '../../../api-request-handler.js';

class PatientTestTypesHandler extends ApiRequestHandler {
	/**
 	 * Handler for the PatientTestTypes request, gets list of tests for the patient
	 * @param {OpalRequest} requestObject
	 * @returns {Promise<{data: {patientSerNum: number, testTypes: Object}}>}
	 */
	static async handleRequest(requestObject) {
		const lastUpdated = requestObject.params.Date ? new Date(Number(requestObject.params.Date)) : 0;
		const patient = await PatientTestTypesHandler.getTargetPatient(requestObject);
		const patientTestResult = new PatientTestResult(patient);
		return {
			"data": {
				"patientSerNum": patient.patientSerNum,
				"testTypes": await patientTestResult.getTestTypes(requestObject.meta.UserID, lastUpdated)
			}
		};
	}
}

export default PatientTestTypesHandler;
