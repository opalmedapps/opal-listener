var sqlInterface=require('./../api/sqlInterface.js');
var q = require('q');
var utility=require('./../utility/utility.js');
const { Version } = require('../../src/utility/version');
const logger            = require('./../logs/logger');

const FIVE_MINUTES = 300000;

// TODO format responses
exports.verifySecurityAnswer = async (requestKey, requestObject) => {
    let rows = await sqlInterface.getUserPatientSecurityInfo(requestObject);
    if(rows.length !== 1) {
        logger.log('error', `getUserPatientSecurityInfo returned ${rows.length} rows when it should have returned 1`);
        return {
            Headers: {
                RequestKey: requestKey,
                RequestObject: requestObject
            },
            Code: 2,
            Data: {},
            Response: 'error',
            Reason: 'Injection attack, incorrect Email'
        };
    }
    let patient = rows[0];

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

exports.setNewPassword = async function(requestKey, requestObject) {
    let rows = await sqlInterface.getUserPatientSecurityInfo(requestObject);
    if(rows.length !== 1) {
        return {
            Headers: {
                RequestKey: requestKey,
                RequestObject: requestObject
            },
            Code: 2,
            Data: {},
            Response: 'error',
            Reason: 'Injection attack, incorrect Email'
        };
    }
    let user = rows[0];

    // Use of RAMQ (SSN) to encrypt password reset requests is no longer supported after 1.12.2 (QSCCD-476)
    let secret = Version.versionGreaterThan(requestObject.AppVersion, Version.version_1_12_2)
        ? utility.hash(user.Email)
        : utility.hash(user.SSN.toUpperCase());
    let answer = user.SecurityAnswer;
    const errorResponse = {
        Headers: {
            RequestKey: requestKey,
            RequestObject: requestObject
        },
        Code: 2,
        Data: {},
        Response: 'error',
        Reason: 'Could not set password'
    };

    logger.log('debug', `Running function setNewPassword for user with UserTypeSerNum = ${user.UserTypeSerNum}`);

    try {
        let unencrypted = await utility.decrypt(requestObject.Parameters, secret, answer);
        await sqlInterface.setNewPassword(utility.hash(unencrypted.newPassword), user.UserTypeSerNum);

        logger.log('debug', 'successfully updated password');
        return {
            RequestKey: requestKey,
            Code: 3,
            Data: { PasswordReset: "true" },
            Headers: {
                RequestKey: requestKey,
                RequestObject: requestObject
            },
            Response: 'success'
        };
    }
    catch(err) {
        logger.log('error', "Error changing the user's password", err);
        throw errorResponse;
    }
};

exports.securityQuestion = async function(requestKey, requestObject) {
    let unencrypted = await utility.decrypt(requestObject.Parameters, utility.hash("none"));

    logger.log('debug', `Unencrypted: ${JSON.stringify(unencrypted)}`);

    // Then this means this is a login attempt
    if (unencrypted.Password) {
        let response = await getSecurityQuestion(requestKey, requestObject, unencrypted)
        logger.log('debug', `Successfully got security question with response: ${JSON.stringify(response)}`);
        return response;
    } else {
        //Otherwise we are dealing with a password reset
        return await getSecurityQuestion(requestKey, requestObject, unencrypted);
    }
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
