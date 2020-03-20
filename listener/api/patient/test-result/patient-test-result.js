const moment = require("moment");
const { PatientTestResultQuery } = require("./patient-test-result.query");
const logger = require("../../../logs/logger");
const opalSQLQuery = require("../../../sql/opal-sql-query");


class PatientTestResult {
	constructor(patient) {
		this._patient = patient;
	}

	async getTestTypes() {
		const query = PatientTestResultQuery.getTestTypesQuery(this._patient.patientSerNum);
		let results;
		try {
			results = await opalSQLQuery.run(query);
		} catch (err) {
			logger.log("debug", `SQL: could not obtain test types for patient ${this._patient}`, error);
		}
		return results;
	}

	async getTestDates() {
		const query = PatientTestResultQuery.getTestResultByDate(this._patient.patientSerNum);
		let results;
		try {
			results = await opalSQLQuery.run(query);
		} catch (err) {
			logger.log("debug", `SQL: could not obtain tests for patient ${this._patient}`, error);
		}
		return results;
	}

	async getTestResultsByDate(date) {
		const query = PatientTestResultQuery.getTestResultsByDateQuery(this._patient.patientSerNum, moment(date)
			.format("YYYY-MM-DD"));
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

	async getTestResultsByType(typeSerNum) {
		const query = PatientTestResultQuery.getTestResultByTestType(this._patient.patientSerNum, typeSerNum);
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