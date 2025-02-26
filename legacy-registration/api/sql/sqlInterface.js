/**  Library Imports **/
const Q = require('q');
const queries = require('../sql/queries.js');
const logger = require('../../logs/logger.js');
const { OpalSQLQueryRunner } = require('../../../listener/sql/opal-sql-query-runner');


exports.runOpaldbSqlQuery = (...args) => OpalSQLQueryRunner.run(...args);

/**
 insertPatient
 @desc insert a patient record.
 @param requestObject
 @return {Promise}
 **/
exports.insertPatient = function (requestObject) {
    let parameters = requestObject.Parameters.Fields;
    return exports.runOpaldbSqlQuery(queries.insertPatient(), [
        parameters.firstName,
        parameters.lastName,
        parameters.sex,
        parameters.dateOfBirth,
        parameters.phone,
        parameters.ramq,
    ]);
};

/**
 insertPatientHospitalIdentifier
 @desc insert a patient hospital identifier record.
 @param requestObject
 @return {Promise}
 **/
exports.insertPatientHospitalIdentifier = function (requestObject) {
    let parameters = requestObject.Parameters.Fields;
    return exports.runOpaldbSqlQuery(queries.insertPatientHospitalIdentifier(), [
        parameters.patientSerNum,
        parameters.mrn,
        parameters.site,
    ]);
};

/**
     registerPatient
     @desc If patient entered all the information, this function will insert the patient data into the database.
     @param requestObject
     @return {Promise}
 **/
exports.registerPatient = function (requestObject) {
    let r = Q.defer();
    let Parameters = requestObject.Parameters.Fields;

    exports.runOpaldbSqlQuery(queries.updatePatient(), [Parameters.ramq, Parameters.email, Parameters.password, Parameters.uniqueId, Parameters.securityQuestion1, Parameters.answer1, Parameters.securityQuestion2, Parameters.answer2, Parameters.securityQuestion3, Parameters.answer3, Parameters.language, Parameters.accessLevel, Parameters.accessLevelSign, Parameters.termsandAggreementId, Parameters.termsandAggreementSign])
        .then((rows) => {

            r.resolve(rows);
        })
        .catch((error) => {
            logger.log('error', 'Problems querying registerPatient due to ' + error);
            r.reject(error);
        });

    return r.promise;
};

/**
 getSiteAndMrn
 @desc If the patient Id is available, get list of patient hospital and mrn if there is any.
 @param requestObject
 @return {Promise}
 **/
exports.getSiteAndMrn = function (requestObject) {
    let r = Q.defer();
    let Parameters = requestObject.Parameters.Fields;

    exports.runOpaldbSqlQuery(queries.getSiteAndMrn(), [Parameters.ramq])
        .then((rows) => {

            r.resolve(rows);
        })
        .catch((error) => {
            logger.log('error', 'Problems querying patient Site and Mrn due to ' + error);
            r.reject(error);
        });

    return r.promise;
};
