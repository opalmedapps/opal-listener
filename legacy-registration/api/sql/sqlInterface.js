/**  Library Imports **/

const mysql = require('mysql');
const Q = require('q');
const queries = require('../sql/queries.js');
const logger = require('../../logs/logger.js');
const config = require('../../config-adaptor');

var exports = module.exports = {};

/** OPAL DATABASE CONFIGURATIONS **/
const opaldbCredentials = {
    connectionLimit: 10,
    host: config.HOST,
    port: config.PORT,
    user: config.MYSQL_USERNAME,
    password: config.MYSQL_PASSWORD,
    database: config.MYSQL_OPAL_DATABASE,
    dateStrings: true
};

/**  REGISTRATION DATABASE CONFIGURATIONS **/
const registerdbCredentials = {
    connectionLimit: 10,
    host: config.HOST,
    port: config.PORT,
    user: config.MYSQL_USERNAME,
    password: config.MYSQL_PASSWORD,
    database: config.MYSQL_REGISTRATION_DATABASE,
    dateStrings: true
};


/**
     SQL POOL CONFIGURATION for opal database
     @type {Pool}
 **/
const opalPool = mysql.createPool(opaldbCredentials);


/**
     SQL POOL CONFIGURATION for registration database
     @type {Pool}
 **/
const registerPool = mysql.createPool(registerdbCredentials);

// Declare variable for storing user name
let FirstName = ""
let LastName = "";

/**
 * getRequestEncryption
 * @desc Gets user registration code for encrypting/decrypting to return ramq
 * @param requestObject
 * @return {Promise}
 */
exports.getRequestEncryption = function (requestObject) {
    return exports.runOpaldbSqlQuery(queries.getRequestEncryption(), [requestObject.BranchName]);
};


/**
     insertIPLog
     @desc Insert the user IP each time they attempt to register this log will be used to block abusive
     @param requestObject
     @return {Promise}
 **/
exports.insertIPLog = function (requestObject) {
    let r = Q.defer();
    let Parameters = requestObject.Parameters.Fields;


    exports.runRegistrationSqlQuery(queries.insertIPLog(), [Parameters.IPAddress])
        .then((rows) => {
            r.resolve(rows);
        })
        .catch((error) => {
            logger.log('error', 'Problems querying insertIPLog due to ' + error);
            r.reject(error);
        });

    return r.promise;
}

/**
     validateIP
     @desc Validate the user IP to check if IP is blocked or not.
     @param requestObject
     @return {Promise}
 **/
exports.validateIP = function (requestObject) {
    let r = Q.defer();
    let Parameters = requestObject.Parameters.Fields;

    exports.runRegistrationSqlQuery(queries.validateIP(), [Parameters.IPAddress])
        .then((rows) => {
            r.resolve(rows);
        })
        .catch((error) => {
            logger.log('error', 'Problems querying validateIP due to ' + error);
            r.reject(error);
        });

    return r.promise;
}

/**
     validateInputs
     @desc This function will validate user's firebaseBranchName, registrationcode, RAMQ.
     @param requestObject
     @return {Promise}
 **/
exports.validateInputs = function (requestObject) {
    let r = Q.defer();
    let Parameters = requestObject.Parameters.Fields;

    exports.runRegistrationSqlQuery(queries.validateInputs(), [Parameters.FirebaseBranchName, Parameters.RegistrationCode, Parameters.RAMQ])
        .then((rows) => {
            r.resolve(rows);
        })
        .catch((error) => {
            logger.log('error', 'Problems querying validateInputs due to ' + error);
            r.reject(error);
        });

    return r.promise;
}


/**
     getSecurityQuestionsList
     @desc Fetch all the security questions from the database if user entered correct RAMQ.
     @param requestObject
     @return {Promise}
 **/
exports.getSecurityQuestionsList = function (requestObject) {
    let r = Q.defer();
    let Parameters = requestObject.Parameters.Fields;

    exports.runOpaldbSqlQuery(queries.getSecQuestionsList(), [Parameters])
        .then((rows) => {
            r.resolve(rows);
        })
        .catch((error) => {
            logger.log('error', 'Problems querying getSecurityQuestionsList due to ' + error);
            r.reject(error);
        });

    return r.promise;
}

/**
     getAccessLevelList
     @desc Fetch the Opal level of access list.
     @param requestObject
     @return {Promise}
 **/
exports.getAccessLevelList = function (requestObject) {
    let r = Q.defer();
    let Parameters = requestObject.Parameters.Fields;

    exports.runOpaldbSqlQuery(queries.getAccessLevelList(), [Parameters])
        .then((rows) => {
            r.resolve(rows);
        })
        .catch((error) => {
            logger.log('error', 'Problems querying getAccessLevelList due to ' + error);
            r.reject(error);
        });

    return r.promise;
}

/**
     getLanguageList
     @desc Get the Opal app language list(French & English)
     @param requestObject
     @return {Promise}
 **/
exports.getLanguageList = function (requestObject) {
    let r = Q.defer();
    let Parameters = requestObject.Parameters.Fields;

    exports.runOpaldbSqlQuery(queries.getLanguageList(), [Parameters])
        .then((rows) => {
            r.resolve(rows);
        })
        .catch((error) => {
            logger.log('error', 'Problems querying getLanguageList due to ' + error);
            r.reject(error);
        });

    return r.promise;
}

/**
     getTermsandAgreementDocuments
     @desc Get the terms and agreement documents
     @param requestObject
     @return {Promise}
 **/
exports.getTermsandAgreementDocuments = function (requestObject) {
    let r = Q.defer();
    let Parameters = requestObject.Parameters.Fields;

    exports.runOpaldbSqlQuery(queries.getTermsandAgreementDocuments(), [Parameters])
        .then((rows) => {
            r.resolve(rows);
        })
        .catch((error) => {
            logger.log('error', 'Problems querying getTermsandAgreementDocuments due to ' + error);
            r.reject(error);
        });

    return r.promise;
}

/**
     registerPatient
     @desc If patient entered all the information, this function will insert the patient data into the database.
     @param requestObject
     @return {Promise}
 **/
exports.registerPatient = function (requestObject) {
    let r = Q.defer();
    let Parameters = requestObject.Parameters.Fields;

    exports.runOpaldbSqlQuery(queries.InsertPatient(), [Parameters.ramq, Parameters.email, Parameters.password, Parameters.uniqueId, Parameters.securityQuestion1, Parameters.answer1, Parameters.securityQuestion2, Parameters.answer2, Parameters.securityQuestion3, Parameters.answer3, Parameters.language, Parameters.accessLevel, Parameters.accessLevelSign, Parameters.termsandAggreementId, Parameters.termsandAggreementSign])
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


/**
     runRegistrationSqlQuery
     @desc Set database connection with the Registration database.
     @param query
     @param parameters
     @param processRawFunction
     @return {Promise}
 **/
exports.runRegistrationSqlQuery = function (query, parameters, processRawFunction) {
    let r = Q.defer();

    registerPool.getConnection(function (err, connection) {
        if (err) logger.log('error', 'Error while grabbing connection from pool due to: ' + err);
        else {
            logger.log('debug', 'Grabbed Registration database connection: ' + connection);
            logger.log('info', 'Successfully grabbed Registration connection from pool and about to perform following query: ' + { query: query });

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
