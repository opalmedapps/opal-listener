const {ValidationError} = require("../../errors/validation-error");
const patientQueries = require("./patient.queries");
const opalSQLQuery = require("../../../sql/opal-sql-query-runner");
const logger = require("../../../logs/logger");

class Patient {
	/**
	 * Constructor for patient, add more fields as needed
	 * @param {number|string} patientSerNum PatientSerNum for the patient in OpalDB
	 * @param {string} firstName
	 * @param {string} lastName
	 * @param {string} email
	 */
	constructor(patientSerNum = 0, firstName = "", lastName = "",
	            email = "") {
		this.patientSerNum = Number(patientSerNum);
		this.firstName = firstName;
		this.lastName = lastName;
		this.email = email;
	}

	static async getPatientByUsername(username = "") {
		const query = patientQueries.getPatientByUsernameQuery(username);
		let results;
		try {
			results = await opalSQLQuery.run(query);
		} catch (err) {
			logger.log("debug", `Error fetching patient with Username ${username}`, err);
			throw err;
		}
		if (results.length === 0) throw new ValidationError(`Patient with username ${username} not found`);
		logger.log("error", results);
		let patientRows = results[0];
		return new Patient(patientRows.PatientSerNum, patientRows.FirstName, patientRows.LastName, patientRows.Email);
	}
}

module.exports = {Patient};
