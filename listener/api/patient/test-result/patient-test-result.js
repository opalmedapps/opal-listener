const moment = require("moment");
const { PatientTestResultQuery } = require("./patient-test-result.query");
const logger = require("../../../logs/logger");
const opalSQLQuery = require("../../../sql/opal-sql-query-runner");


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
	 * @returns {Promise<Object>} Returns the test types for the patient 
	 */
	async getTestTypes() {
		const query = PatientTestResultQuery.getTestTypesQuery(this._patient.patientSerNum);
		let results;
		try {
			results = await opalSQLQuery.run(query);
		} catch (err) {
			logger.log("debug", `SQL: could not obtain test types for patient ${this._patient}`, error);
			throw err;
		}
		return results;
	}

	/**
	 * Method gets the test dates for the patient
	 * @returns {Promise<Object[]>} Returns the test types for the patient 
	 */
	async getTestDates() {
		const query = PatientTestResultQuery.getTestDatesQuery(this._patient.patientSerNum);
		let results;
		try {
			results = await opalSQLQuery.run(query);
		} catch (err) {
			logger.log("debug", `SQL: could not obtain tests for patient ${this._patient}`, error);
			throw err;
		}
		return results;
	}

	/**
	 * Method gets the test results by date
	 * @param {Date} date Date to obtains the results for.
	 * @returns {Promise<Object>} Returns the test types for the patient 
	 */
	async getTestResultsByDate(date) {
		const query = PatientTestResultQuery.getTestResultsByDateQuery(this._patient.patientSerNum, moment(date)
			.format("YYYY-MM-DD hh:mm:ss"));
		let results;
		try {
			results = await opalSQLQuery.run(query);
		} catch (err) {
			logger.log("debug", `SQL: could not obtain tests for date ${date.toString()}` +
				`for patient ${this._patient}`);
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
			results = await opalSQLQuery.run(query);
		} catch (err) {
			logger.log("debug", `SQL: could not obtain result latest information for test ExpressionSerNum `+
					`${typeSerNum} for patient ${this._patient}`);
			throw err;
		}
		return results;
	}

	/**
	 * Method gets the latest result for the given test type
	 * @param {number} typeSerNum ExpressionSerNum for the test type
	 * @returns {Promise<Object>} Returns an test result object containing the latest values for given test dates.
	 */
	async getLatestTestResultByTestType(testTypeSerNum) {
		const query = PatientTestResultQuery.getLatestTestResultByTestType(this._patient.patientSerNum,
						testTypeSerNum);
		let results;
		try {
			results = await opalSQLQuery.run(query);
		} catch (err) {
			logger.log("debug", `SQL: could not obtain results fort test ExpressionSerNum ${testTypeSerNum}` +
				` for patient ${this._patient}`);
			throw err;
		}
		if(results.length === 0) return null;
		return results[0];
	}
}

module.exports = {PatientTestResult};