// SPDX-FileCopyrightText: Copyright 2020 Opal Health Informatics Group at the Research Institute of the McGill University Health Centre <john.kildea@mcgill.ca>
//
// SPDX-License-Identifier: AGPL-3.0-or-later

import ValidationError from '../../errors/validation-error.js';
import patientQueries from './patient.queries.js';
import OpalSQLQueryRunner from '../../../sql/opal-sql-query-runner.js';
import logger from '../../../logs/logger.js';

class Patient {
	/**
	 * Constructor for patient, add more fields as needed
	 * @param {number|string} patientSerNum PatientSerNum for the patient in OpalDB
	 * @param {string} firstName
	 * @param {string} lastName
	 * @param {string} email
	 * @param {string} language - The language string for the patient, as stored in OpalDB ('FR', 'EN').
	 */
	constructor(patientSerNum = 0, firstName = "", lastName = "",
	            email = "", language = "") {
		this.patientSerNum = Number(patientSerNum);
		this.firstName = firstName;
		this.lastName = lastName;
		this.email = email;
		this.language = language;
	}

	/**
	 * @desc See #getPatient.
	 */
	static async getPatientByUsername(username) {
		return this.#getPatient(username, patientQueries.getPatientByUsernameQuery, "Username");
	}

	/**
	 * @desc See #getPatient.
	 */
	static async getPatientBySerNum(patientSerNum) {
		return this.#getPatient(patientSerNum, patientQueries.getPatientBySerNumQuery, "PatientSerNum");
	}

	/**
	 * @desc Factory method that returns a Patient object based on an identifier (PatientSerNum or Username).
	 * @param identifier The identifier used to find the patient (passed as a parameter to the sql).
	 * @param {function} sql Function that takes as input the identifier and returns the query used to look up the patient.
	 * @param {string} identifierNameForLogs The name of the identifier (e.g. 'PatientSerNum'), used to print informative logs.
	 * @returns {Promise<Patient>} Resolves with a patient object built using the rows found by the query.
	 */
	static async #getPatient(identifier, sql, identifierNameForLogs) {
		const query = sql(identifier);
		let results;
		try {
			results = await OpalSQLQueryRunner.run(query);
		} catch (err) {
			logger.log("error", `Error fetching patient with ${identifierNameForLogs} = ${identifier}`, err);
			throw err;
		}
		if (results.length === 0) {
			logger.log("error", `Patient with ${identifierNameForLogs} = ${identifier} not found`, results);
			throw new ValidationError(`Patient with ${identifierNameForLogs} = ${identifier} not found`);
		}
		let patientRows = results[0];
		return new Patient(patientRows.PatientSerNum, patientRows.FirstName, patientRows.LastName, patientRows.Email, patientRows.Language);
	}
}

export default Patient;
