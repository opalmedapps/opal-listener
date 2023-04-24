var sqlInterface=require('./../api/sqlInterface.js');
var q = require('q');
var utility=require('./../utility/utility.js');
const { Version } = require('../../src/utility/version');
const logger            = require('./../logs/logger');

const FIVE_MINUTES = 300000;

exports.resetPasswordRequest=function(requestKey, requestObject)
{

    var r=q.defer();
    var responseObject = {};
    //Get the patient fields to verify the credentials

    logger.log('debug', 'Running function to either VerifyAnswer or SetNewPassword');

    sqlInterface.getPatientFieldsForPasswordReset(requestObject).then(function(patient){
        //Check for injection attacks by the number of rows the result is returning
        if(patient.length>1||patient.length === 0)
        {
            responseObject = { Headers:{RequestKey:requestKey,RequestObject:requestObject}, Code: 2, Data:{},Response:'error', Reason:'Injection attack, incorrect Email'};
            r.resolve(responseObject);
        }else{
            //If the request is not erroneous simply direct the request to appropriate function based on the request mapping object
            requestMappings[requestObject.Request](requestKey, requestObject, patient[0]).then(r.resolve).catch(r.reject);
        }
    }).catch(function(error){
        //If there is an error with the queries reply with an error message
        responseObject = { Headers:{RequestKey:requestKey,RequestObject:requestObject}, Code: 2, Data:{},Response:'error', Reason: error+""};
        r.resolve(responseObject);
    });
    return r.promise;

};

exports.verifySecurityAnswer = async (requestKey, requestObject, patient) => {
    logger.log('debug', 'in verify security answer');
    logger.log('debug', `patient: ${JSON.stringify(patient)}`);

    if(patient.TimeoutTimestamp != null && requestObject.Timestamp - (new Date(patient.TimeoutTimestamp)).getTime() > FIVE_MINUTES) {
        logger.log('debug', 'resetting security answer attempt');
        await sqlInterface.resetSecurityAnswerAttempt(requestObject);
    }
    else if(patient.Attempt == 5) {
        //If 5 attempts have already been made, lock the user out for 5 minutes
        if(patient.TimeoutTimestamp == null) sqlInterface.setTimeoutSecurityAnswer(requestObject, requestObject.Timestamp);
        return {Code: 4, RequestKey:requestKey, Data:"Attempted security answer more than 5 times, please try again in 5 minutes", Headers:{RequestKey:requestKey,RequestObject:requestObject}, Response:'error'};
    }

    let unencrypted = null;

    logger.log('debug', 'decrypting');

    //Wrap decrypt in try-catch because if error is caught that means decrypt was unsuccessful, hence incorrect security answer
    try {
        let params = await utility.decrypt(requestObject.Parameters, patient.SecurityAnswer);

        logger.log('debug', `params: ${JSON.stringify(params)}`);

        unencrypted = params;

        //If its the right security answer, also make sure is a valid SSN;
        var response = {};

        var ssnValid = unencrypted.SSN && unencrypted.SSN.toUpperCase() === patient.SSN && unencrypted.Answer && unencrypted.Answer === patient.SecurityAnswer;
        var answerValid = unencrypted.Answer === patient.SecurityAnswer;
        var isVerified = false;

        // Use of RAMQ (SSN) in password reset requests is no longer supported after 1.12.2 (QSCCD-476)
        if (unencrypted.PasswordReset && Version.versionLessOrEqual(requestObject.AppVersion, Version.version_1_12_2)) {
            isVerified = ssnValid;
        } else {
            isVerified = answerValid;
        }

        if (isVerified) {
            try {
                await sqlInterface.setTrusted(requestObject)
                await sqlInterface.resetSecurityAnswerAttempt(requestObject);
                return {
                    RequestKey: requestKey,
                    Code: 3,
                    Data: { AnswerVerified: "true" },
                    Headers: {
                        RequestKey: requestKey,
                        RequestObject: requestObject
                    },
                    Response: 'success'
                };
            }
            catch(error) {
                logger.log('error', 'Failed to set the device as trusted', error);
                throw {
                    Headers: {
                        RequestKey: requestKey,
                        RequestObject: requestObject
                    },
                    Code: 2,
                    Data: {},
                    Response: 'error',
                    Reason: 'Could not set trusted device'
                };
            }
        } else {
            return { RequestKey:requestKey, Code:3,Data:{AnswerVerified:"false"}, Headers:{RequestKey:requestKey,RequestObject:requestObject},Response:'success'};
        }
    }
    catch(error) {
        //Check if timestamp for lockout is old, if it is reset the security answer attempts
        logger.log('error', 'increase security answer attempt due to error decrypting', error);
        await sqlInterface.increaseSecurityAnswerAttempt(requestObject);
        return { RequestKey:requestKey, Code:3,Data:{AnswerVerified:"false"}, Headers:{RequestKey:requestKey,RequestObject:requestObject},Response:'success'};
    }
};

exports.setNewPassword=function(requestKey, requestObject, user)
{
    var r=q.defer();
    // Use of RAMQ (SSN) to encrypt password reset requests is no longer supported after 1.12.2 (QSCCD-476)
    let secret = Version.versionGreaterThan(requestObject.AppVersion, Version.version_1_12_2)
        ? utility.hash(user.Email)
        : utility.hash(user.SSN.toUpperCase());
    var answer = user.SecurityAnswer;
    const errorResponse = {Headers: {RequestKey:requestKey, RequestObject:requestObject}, Code:2, Data:{}, Response:'error', Reason:'Could not set password'};

    logger.log('debug', `Running function setNewPassword for user with UserTypeSerNum = ${user.UserTypeSerNum}`);

    utility.decrypt(requestObject.Parameters, secret, answer)
        .then((unencrypted)=> {
            sqlInterface.setNewPassword(utility.hash(unencrypted.newPassword), user.UserTypeSerNum).then(function(){
                logger.log('debug', 'successfully updated password');
                var response = { RequestKey:requestKey, Code:3, Data:{PasswordReset:"true"}, Headers:{RequestKey:requestKey,RequestObject:requestObject},Response:'success'};
                r.resolve(response);
            }).catch(function(error){
                logger.log('error', 'error updating password', error);
                r.resolve(errorResponse);
            });
        }).catch(err => {
            logger.log('error', 'Decryption error during setNewPassword', err);
            r.reject(errorResponse);
        });

    return r.promise;
};

exports.securityQuestion=function(requestKey,requestObject) {
    let r = q.defer();

    let unencrypted = null;
    return utility.decrypt(requestObject.Parameters, utility.hash("none"))
        .then((params) => {
            unencrypted = params;

            logger.log('debug', `Unencrypted: ${JSON.stringify(unencrypted)}`);

            let email = requestObject.UserEmail;
            let password = unencrypted.Password;

            //Then this means this is a login attempt
            if (password) {
                return getSecurityQuestion(requestKey, requestObject, unencrypted).then(function (response) {
                    logger.log('debug', `Successfully got security question with response: ${JSON.stringify(response)}`);
                    return response
                });
            } else {
                //Otherwise we are dealing with a password reset
                return getSecurityQuestion(requestKey, requestObject, unencrypted);
            }

        });
};

async function getSecurityQuestion(requestKey, requestObject, unencrypted) {
    requestObject.Parameters = unencrypted;
    logger.log('debug', 'in get security question with: ' + requestObject);

    try {
        await sqlInterface.updateDeviceIdentifier(requestObject);
        let response = await sqlInterface.getSecurityQuestion(requestObject);
        return {
            Headers:{RequestKey:requestKey,RequestObject:requestObject},
            Code:3,
            Data:response.Data,
            Response:'success'
        };
    }
    catch(error) {
        logger.log('error', 'Error getting a security question for the user');
        return {
            Headers:{RequestKey:requestKey,RequestObject:requestObject},
            Code: 2,
            Data:{},
            Response:'error',
            Reason:response
        };
    }
}

var requestMappings = {
    'SetNewPassword':exports.setNewPassword,
    'VerifyAnswer':exports.verifySecurityAnswer
};
