var exports = module.exports = {};

const questionnaireQueries = require('./questionnaireQueries.js');
const questionnaires = require('./questionnaireQuestionnaireDB.js');
const opalQueries = require('../sql/queries');
const questionnaireValidation = require('./questionnaire.validate');
const logger = require('./../logs/logger');
const {OpalSQLQueryRunner} = require("../sql/opal-sql-query-runner");
const https = require('https');
const querystring = require('querystring');

exports.getQuestionnaireInOpalDB = getQuestionnaireInOpalDB;
exports.getQuestionnaireList = getQuestionnaireList;
exports.getQuestionnaire = getQuestionnaire;
exports.questionnaireSaveAnswer = questionnaireSaveAnswer;
exports.questionnaireUpdateStatus = questionnaireUpdateStatus;

const lastUpdatedDateForGettingPatient = '0000-00-00';

/*
FUNCTIONS TO GET QUESTIONNAIRES (QUESTIONNAIRE V2)
 */

/**
 * getQuestionnaireInOpalDB
 * @desc Returns a promise containing the questionnaire's general information stored in OpalDB. Used for the new questionnaire 2019
 * @param {object} requestObject
 * @returns {Promise} object containing the questionnaire's general information stored in OpalDB
 */
function getQuestionnaireInOpalDB(requestObject) {
    return new Promise(function(resolve, reject) {
        if (!questionnaireValidation.validateQuestionnaireSerNum(requestObject)) {

            const paramErrMessage = "Error getting questionnaire data stored in OpalDB: the requestObject does not have the required parameters";
            logger.log("error", paramErrMessage);
            reject(new Error(paramErrMessage));

        } else {
            OpalSQLQueryRunner.run(questionnaireQueries.getQuestionnaireInOpalDBFromSerNum(), [requestObject.Parameters.questionnaireSerNum])
                .then(function (rows) {
                    if (rows.length !== 1) {

                        const questionnaireSerNumErrMessage = `Error getting questionnaire data stored in OpalDB: the questionnaireSerNum ${requestObject.Parameters.questionnaireSerNum} does not have exactly one matching questionnaire`;
                        logger.log("error", questionnaireSerNumErrMessage);
                        reject(new Error(questionnaireSerNumErrMessage));

                    } else {
                        let obj = {};
                        obj.Data = rows[0];
                        resolve(obj);
                    }
                })
                .catch(function (error) {
                    logger.log("error", "Error getting questionnaire data stored in OpalDB", error);
                    reject(error);
                });
        }
    });
}

/**
 * getQuestionnaireList
 * @desc Returns a promise containing the questionnaire list for a particular user. Used for the new questionnaire 2019
 * @param {object} requestObject
 * @return {Promise} Returns a promise that contains a list of questionnaire data
 */
function getQuestionnaireList(requestObject) {

    return OpalSQLQueryRunner.run(opalQueries.patientTableFields(), [requestObject.UserID, lastUpdatedDateForGettingPatient])
        .then(function (patientSerNumAndLanguageRow) {

            if (questionnaireValidation.validatePatientSerNumAndLanguage(patientSerNumAndLanguageRow)) {
                // get questionnaire list
                return questionnaires.getQuestionnaireList(patientSerNumAndLanguageRow[0]);
            } else {
                logger.log("error", "Error getting questionnaire list: No matching PatientSerNum or/and Language found in opalDB");
                throw new Error('Error getting questionnaire list: No matching PatientSerNum or/and Language found in opalDB');
            }
        })
        .then(function (result) {
            let obj = {};
            obj.Data = result;
            return obj;
        })
        .catch(function (error) {
            logger.log("error", "Error getting questionnaire list", error);
            throw new Error(error);
        });
}

/**
 * getQuestionnaire
 * @desc Returns a promise containing the questionnaires and answers. Used for new questionnaire 2019
 * @param {object} requestObject the request
 * @returns {Promise} Returns a promise that contains the questionnaire data
 */
function getQuestionnaire(requestObject) {

    return new Promise(function (resolve, reject) {
        // check argument
        if (!questionnaireValidation.validatingPatientQuestionnaireSerNum(requestObject)) {
            reject(new Error('Error getting questionnaire: the requestObject does not have the required parameter qp_ser_num'));

        } else {
            // get language in the database
            OpalSQLQueryRunner.run(opalQueries.patientTableFields(), [requestObject.UserID, lastUpdatedDateForGettingPatient])
                .then(function (patientSerNumAndLanguageRow) {

                    if (questionnaireValidation.validatePatientSerNumAndLanguage(patientSerNumAndLanguageRow)) {
                        // get questionnaire belonging to that qp_ser_num
                        return questionnaires.getQuestionnaire(patientSerNumAndLanguageRow[0], requestObject.Parameters.qp_ser_num);
                    } else {
                        logger.log("error", "Error getting questionnaire: No matching PatientSerNum or/and Language found in opalDB");
                        reject(new Error('Error getting questionnaire: No matching PatientSerNum or/and Language found in opalDB'));
                    }
                })
                .then(function (result) {
                    let obj = {};
                    obj.Data = result;
                    resolve(obj);
                })
                .catch(function (error) {
                    logger.log("error", "Error getting questionnaire", error);
                    reject(error);
                });
        }
    });
}

/*
FUNCTIONS TO SAVE ANSWERS (QUESTIONNAIRE V2)
 */
/**
 * @name questionnaireSaveAnswer
 * @desc save the answer of one question
 * @param {object} requestObject
 * @returns {Promise}
 */
function questionnaireSaveAnswer(requestObject) {
    return new Promise(function (resolve, reject) {
        // check argument
        if (!questionnaireValidation.validateParamSaveAnswer(requestObject)) {
            logger.log("error", "Error saving answer: the requestObject does not have the required parameters");
            reject(new Error('Error saving answer: the requestObject does not have the required parameters'));

        } else {
            // get language in the opal database
            OpalSQLQueryRunner.run(opalQueries.patientTableFields(), [requestObject.UserID, lastUpdatedDateForGettingPatient])
                .then(function (patientSerNumAndLanguageRow) {

                    if (questionnaireValidation.validatePatientSerNumAndLanguage(patientSerNumAndLanguageRow)) {
                        // save answer in questionnaire DB
                        return questionnaires.saveAnswer(patientSerNumAndLanguageRow[0], requestObject.Parameters, requestObject.AppVersion);
                    } else {
                        logger.log("error", "Error saving answer: No matching PatientSerNum or/and Language found in opalDB");
                        reject(new Error('Error saving answer: No matching PatientSerNum or/and Language found in opalDB'));
                    }

                })
                .then(function () {
                    // no need to update opalDB questionnaire status since it is not completed.
                    resolve({Response: 'success'});

                })
                .catch(function (error) {
                    logger.log("error", "Error saving answer", error);
                    reject(error);
                });
        }
    });
}


/**
 * @name questionnaireUpdateStatus
 * @desc this function is used to update the questionnaire status in both the OpalDB and the questionnaireDB
 * @param {object} requestObject
 * @returns {Promise}
 */
function questionnaireUpdateStatus(requestObject) {
    return new Promise(function (resolve, reject) {
        // check arguments
        if (!questionnaireValidation.validateParamUpdateStatus(requestObject)) {
            logger.log("error", "Error updating status: the requestObject does not have the required parameters");
            reject(new Error('Error updating status: the requestObject does not have the required parameters'));

        } else {
            let patientSerNumOpalDB;

            // 1. update the status in the answerQuestionnaire table in questionnaire DB
            // get patientSerNum in the opal database
            OpalSQLQueryRunner.run(opalQueries.patientTableFields(), [requestObject.UserID, lastUpdatedDateForGettingPatient])
                .then(function (patientSerNumAndLanguageRow) {
                    // check returns
                    if (!questionnaireValidation.validatePatientSerNumAndLanguage(patientSerNumAndLanguageRow)) {
                        logger.log("error", "Error updating status: No matching PatientSerNum found in opalDB");
                        reject(new Error('Error updating status: No matching PatientSerNum found in opalDB'));
                    } else {
                        patientSerNumOpalDB = patientSerNumAndLanguageRow[0].PatientSerNum;
                        return questionnaires.updateQuestionnaireStatusInQuestionnaireDB(requestObject.Parameters.answerQuestionnaire_id, requestObject.Parameters.new_status, requestObject.AppVersion);
                    }

                }).then(function (isCompleted) {

                    // 2. update the status in the questionnaire table of the opal DB if completed
                    if (isCompleted === 1) {
                        return OpalSQLQueryRunner.run(questionnaireQueries.updateQuestionnaireStatus(), [isCompleted, requestObject.Parameters.answerQuestionnaire_id]);
                        // TODO: do we rollback if this fails + insert log into DB
                    } else {
                        resolve({Response: 'success'});
                    }
                }).then(function () {

                // Https call to call Questionnaire Trigger API.
                // If patient submit ESAS questionnaire it fires secondary questionnaire if answers meets the trigger condition.

                /*  Keeping system-login code in comments. In future every external call to OpalAdmin needs to go through system-login API. */


                var login_credentials = {
                    "username": "TriggerSystem",
                    "password": "pcGNdtwTV8Pd79FkLhP!ejH8Y^KR&4@u"
                };

                var parameter = querystring.stringify(login_credentials);

                var options = {
                    hostname: 'localhost',  //'172.26.123.102',
                    port: '443',
                    path: '/opalAdmin/user/system-login',
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/x-www-form-urlencoded'
                    },
                    body: login_credentials
                };

                //  Has to set unauthorized environment variable to 0
                process.env["NODE_TLS_REJECT_UNAUTHORIZED"] = 0;

                var response_string = "";
                var request = https.request(options, function (response) {
                    response.on('data', function (chunk) {
                        response_string += chunk;
                    });
                    response.on('end', function () {
                        logger.log("info","OpalAdmin system-login authentication message ", response_string);

                        // Once user is authenticated extract the PHPSESSID from the header and pass in the header into next API call.
                        var cookie = response.headers["set-cookie"];
                        cookie = cookie.toString().split(';')[0];


                        console.log ("*************************************************  ", cookie);
                        var sub_parameter = {
                            "id": requestObject.Parameters.answerQuestionnaire_id
                        };

                    var sub_parameter_qs = querystring.stringify(sub_parameter);
                        var sub_options = {
                            hostname: 'localhost', //'172.26.123.102',
                            port: '443',
                            path: '/opalAdmin/trigger/execute/questionnaire-triggers',
                            method: 'POST',
                            headers: {
                                'Content-Type': 'application/x-www-form-urlencoded',
                                'Cookie': cookie
                            },
                            body: sub_parameter
                        };

                        //  Has to set unauthorized environment variable to 0
                        //process.env["NODE_TLS_REJECT_UNAUTHORIZED"] = 0;

                        var sub_response_string = "";
                        var sub_request = https.request(sub_options, function (sub_response) {
                            sub_response.on('data', function (chunk) {
                                sub_response_string += chunk;
                            });
                            sub_response.on('end', function () {
                                logger.log("info","OpalAdmin execute-trigger call response ",sub_response_string);


                                console.log ("************************************************* ########################## ", sub_response_string);



                                resolve({Response: 'success'});
                            });
                        });

                        sub_request.write(sub_parameter_qs);
                        sub_request.end();
                    });
                });


                request.write(parameter);
                request.end();
               

                }).catch(function (err) {
                    logger.log("error", "Error updating status", err);
                    reject(err);
                });
        }
    });
}