const patientQueries = require("./patient.queries");
const opalSqlQuery = require("../../sql/opal-sql-query");
const logger = require("./../../logs/logger");

class Patient {
    constructor(patientSerNum=0, firstName="", lastName="", 
                email="", sex="", ramq="", dateOfBirth=new Date(), enabledSMS=false, language=""){
        this.patientSerNum = 0;
        this.firstName = firstName;
        this.lastName = lastName;
        this.email = email;
        this.sex = sex;
        this.ramq = ramq;
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
        console.log(results);
        return new Patient(...results);
    }
}
module.exports = {Patient};