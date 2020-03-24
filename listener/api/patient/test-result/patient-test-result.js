const moment = require("moment");
const { PatientTestResultQuery } = require("./patient-test-result.query");
const logger = require("../../../logs/logger");
const opalSQLQuery = require("../../../sql/opal-sql-query");


class PatientTestResult {
	constructor(patient) {
		this._patient = patient;
		logger.log("error", patient);
	}

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

	async getLatestTestResultByTestType(testTypeSerNum) {
		const query = PatientTestResultQuery.getLatestTestResultByTestType(this._patient.patientSerNum, typeSerNum);
		let results;
		try {
			results = await opalSQLQuery.run(query);
		} catch (err) {
			logger.log("debug", `SQL: could not obtain results for test ExpressionSerNum ${typeSerNum}` +
				` for patient ${this._patient}`);
			throw err;
		}
		return results;
	}
}

module.exports = {PatientTestResult};