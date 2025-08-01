// SPDX-FileCopyrightText: Copyright 2020 Opal Health Informatics Group at the Research Institute of the McGill University Health Centre <john.kildea@mcgill.ca>
//
// SPDX-License-Identifier: AGPL-3.0-or-later

import logger from '../../../../logs/logger.js';
import OpalSQLQueryRunner from '../../../../sql/opal-sql-query-runner.js';
import PatientTestResultQuery from '../queries/patient-test-result.query.js';

class PatientTestResult {
	/**
	 * Base constructor takes a patient
	 * @param {Patient} patient
	 */
	constructor(patient) {
		this._patient = patient;
	}

	/**
	 * Method gets the test types for the patient
	 * @param {String} userId - Firebase userId making the request.
	 * @param {Date} [lastUpdated] - Optional date/time; if provided, only items with 'LastUpdated' after this time are returned.
	 * @returns {Promise<Object>} Returns the test types for the patient
	 */
	async getTestTypes(userId, lastUpdated=0) {
		const query = PatientTestResultQuery.getTestTypesQuery(`"${userId}"`, this._patient.patientSerNum, lastUpdated);
		let results;
		try {
			results = await OpalSQLQueryRunner.run(query);
		} catch (err) {
			logger.log("error", `SQL: could not obtain test types for patient ${this._patient}`, err);
			throw err;
		}
		return results;
	}

	/**
	 * Method gets the test dates for the patient
	 * @param {String} userId - Firebase userId making the request
	 * @param {Date} [lastUpdated] - Optional date/time; if provided, only items with 'LastUpdated' after this time are returned.
	 * @returns {Promise<Object[]>} Returns the test dates for the patient
	 */
	async getTestDates(userId, lastUpdated=0) {
		const query = PatientTestResultQuery.getTestDatesQuery(
			`"${userId}"`,
			this._patient.patientSerNum,
			lastUpdated,
		);
		let results;
		try {
			results = await OpalSQLQueryRunner.run(query);
		} catch (err) {
			logger.log("error", `SQL: could not obtain tests for patient ${this._patient}`, err);
			throw err;
		}
		return results;
	}

	/**
	 * Method gets the test results by date
	 * @param {String} userId - Firebase userId making the request
	 * @param {Date} date Date to obtains the results for.
	 * @returns {Promise<Object>} Returns the test types for for a given date
	 */
	async getTestResultsByDate(userId, date) {
		const query = PatientTestResultQuery.getTestResultsByDateQuery(`"${userId}"`, this._patient.patientSerNum, date);
		let results;
		try {
			results = await OpalSQLQueryRunner.run(query);
		} catch (err) {
			logger.log("error", `SQL: could not obtain tests for date ${date.toString()} for patient ${this._patient}`, err);
			throw err;
		}
		return results;
	}

	/**
	 * Method obtains the test results values for a given test type
	 * @param {number} typeSerNum ExpressionSerNum to get the results for.
	 * @returns {Promise<Object[]>} Returns an array of the test results
	 */
	async getTestResultValuesByTestType(typeSerNum) {
		const query = PatientTestResultQuery.getTestResultValuesByTestType(this._patient.patientSerNum, typeSerNum);
		let results;
		try {
			results = await OpalSQLQueryRunner.run(query);
		} catch (err) {
			logger.log("error", `SQL: could not obtain result latest information for test ExpressionSerNum ${typeSerNum} for patient ${this._patient}`, err);
			throw err;
		}
		return results;
	}

	/**
	 * Method gets the latest result for the given test type
	 * @param {String} userId - Firebase userId making the request
	 * @param {number} testTypeSerNum ExpressionSerNum for the test type.
	 * @returns {Promise<Object>} Returns an test result object containing the latest values for given test types.
	 */
	async getLatestTestResultByTestType(userId, testTypeSerNum) {
		const query = PatientTestResultQuery.getLatestTestResultByTestType(`"${userId}"`, this._patient.patientSerNum,
			testTypeSerNum);
		let results;
		try {
			results = await OpalSQLQueryRunner.run(query);
		} catch (err) {
			logger.log("error", `SQL: could not obtain results fort test ExpressionSerNum ${testTypeSerNum} for patient ${this._patient}`, err);
			throw err;
		}
		if (results.length === 0) return null;
		return results[0];
	}

	/**
	 * Mark test results as read for a given list of testResultSerNums.
	 * @param {String} userId - Firebase userId making the request
	 * @param {Array.<Number>} testResultSerNums Test results that should be marked as read
	 * @returns {Promise<Object>} Returns an array of test results that were marked as read.
	 */
	async markTestResultsAsRead(userId, testSerNums) {
		const query = PatientTestResultQuery.markTestResultsAsRead(
			userId,
			testSerNums,
		);

		let results;
		try {
			results = await OpalSQLQueryRunner.run(query);
		} catch (err) {
			logger.log("error", `SQL: could not mark test results as read for PatientTestResultSerNum ${testSerNums} for patient ${this._patient}`, err);
			throw err;
		}
		if (results.length === 0) return null;
		return results[0];
	}
}

export default PatientTestResult;
