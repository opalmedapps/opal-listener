/**  Library Imports **/

const mysql = require('mysql');
const Q = require('q');
const queries = require('../sql/queries.js');
const logger = require('../../logs/logger.js');
const config = require('../../config-adaptor');

/** OPAL DATABASE CONFIGURATIONS **/
const opaldbCredentials = {
    connectionLimit: 10,
    host: config.MYSQL_DATABASE_HOST,
    port: config.MYSQL_DATABASE_PORT,
    user: config.MYSQL_USERNAME,
    password: config.MYSQL_PASSWORD,
    database: config.MYSQL_DATABASE,
    dateStrings: true
};


/**
     SQL POOL CONFIGURATION for opal database
     @type {Pool}
 **/
const opalPool = mysql.createPool(opaldbCredentials);

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

/**
    runOpaldbSqlQuery
     @desc Set database connection pool with the Opal database
     @param query
     @param parameters
     @param processRawFunction
     @return {Promise}
 **/

exports.runOpaldbSqlQuery = function (query, parameters, processRawFunction) {
    let r = Q.defer();

    opalPool.getConnection(function (err, connection) {
        if (err) logger.log('error', 'Error while grabbing connection from pool due to: ' + err);
        else {
            logger.log('debug', 'Grabbed Opal database connection: ' + connection);
            logger.log('info', 'Successfully grabbed Opal connection from pool and about to perform following query: ' + { query: query });

            const que = connection.query(query, parameters, function (err, rows, fields) {
                connection.release();

                logger.log('info', 'Successfully performed query', { query: que.sql, response: JSON.stringify(rows) });
                if (err) {
                    logger.log('error', 'Error while performing query due to: ' + err);
                    r.reject(err);
                }
                if (typeof rows !== 'undefined') {
                    if (processRawFunction && typeof processRawFunction !== 'undefined') {
                        processRawFunction(rows).then(function (result) {
                            r.resolve(result);
                        });
                    } else {
                        r.resolve(rows);
                    }
                } else {
                    r.resolve([]);
                }
            });
        };
    });
    return r.promise;
};
