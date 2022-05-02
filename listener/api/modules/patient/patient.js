const {ValidationError} = require("../../errors/validation-error");
const patientQueries = require("./patient.queries");
const {OpalSQLQueryRunner} = require("../../../sql/opal-sql-query-runner");
const logger = require("../../../logs/logger");

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

	static async getPatientByUsername(username = "") {
		const query = patientQueries.getPatientByUsernameQuery(username);
		let results;
		try {
			results = await OpalSQLQueryRunner.run(query);
		} catch (err) {
			logger.log("error", `Error fetching patient with Username ${username}`, err);
			throw err;
		}
		if (results.length === 0) {
			logger.log("error", `Patient with username ${username} not found`, results);
			throw new ValidationError(`Patient with username ${username} not found`);
		}
		let patientRows = results[0];
		return new Patient(patientRows.PatientSerNum, patientRows.FirstName, patientRows.LastName, patientRows.Email, patientRows.Language);
	}
}

module.exports = {Patient};
