const patientQueries = require("./patient.queries");
const opalSqlQuery = require("../../sql/opal-sql-query");
const logger = require("./../../logs/logger");

class Patient {
    /**
     * Constructor for patient, add more fields as needed
     * @param {number|string} patientSerNum PatientSerNum for the patient in OpalDB
     * @param {string} firstName
     * @param {string} lastName
     * @param {string} email
     */
    constructor(patientSerNum=0, firstName="", lastName="",
                email=""){
        this.patientSerNum = Number(0);
        this.firstName = firstName;
        this.lastName = lastName;
        this.email = email;
        this.sex = sex;
        this.ssn = ssn;
    }
    static async getPatientByUsername(username=""){
        const query = patientQueries.getPatientQuery(username);
        let results;
        try{
            results = await opalSqlQuery.run(query);
        }catch(err){
            logger.log("debug", `Error fetching patient with Username ${username}`, err);
            throw err;
        }
        if(results.length === 0) throw new Error(`Patient with username ${username} not found`);
        logger.log("error", results);
        let patientRows = results[0];
        return new Patient(patientRows.PatientSerNum, patientRows.FirstName, patientRows.LastName, patientRows.Email);
    }
}
module.exports = {Patient};
