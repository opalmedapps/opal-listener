const logger = require('./../logs/logger');
const sqlInterface = require('./../api/sqlInterface.js');
const utility = require('./../utility/utility.js');
const { Version } = require('../../src/utility/version');
const OpalResponse = require('../api/response/response');
const OpalSecurityResponseError = require('../api/response/security-response-error');
const OpalSecurityResponseSuccess = require('../api/response/security-response-success');

const FIVE_MINUTES = 300000;
const CODE = OpalResponse.CODE;

const answerVerified = { AnswerVerified: "true" };
const answerNotVerified = { AnswerVerified: "false" };


// TODO format responses
exports.verifySecurityAnswer = async (requestKey, requestObject) => {
    logger.log('info', `Verifying security answer for username ${requestObject?.UserID}`);

    // Get security info needed to verify the answer, including the cached answer from PatientDeviceIdentifier.
    let user = getUserPatientSecurityInfo(requestKey, requestObject);

    // TODO test
    // Handle security answer attempts (resetting the attempts, or blocking the user after too many attempts)
    if (user.TimeoutTimestamp != null && requestObject.Timestamp - (new Date(user.TimeoutTimestamp)).getTime() > FIVE_MINUTES) {
        logger.log('verbose', `Resetting number of security answer attempts for username ${requestObject?.UserID}`);
        await sqlInterface.resetSecurityAnswerAttempt(requestObject);
    }
    else if (user.Attempt === 5) {
        // If 5 attempts have already been made, lock the user out for 5 minutes
        logger.log('verbose', `Blocking user after reaching 5 security answer attempts for username ${requestObject?.UserID}`);
        if (user.TimeoutTimestamp == null) await sqlInterface.setTimeoutSecurityAnswer(requestObject, requestObject.Timestamp);
        throw new OpalSecurityResponseError(CODE.TOO_MANY_ATTEMPTS, "Attempted and failed security answer 5 times", requestKey, requestObject);
    }

    let unencrypted;

    // An error caught during decryption indicates an incorrect security answer
    try {
        logger.log('debug', 'Attempting decryption to verify security answer');
        unencrypted = await utility.decrypt(requestObject.Parameters, user.SecurityAnswer);
    }
    catch (error) {
        logger.log('error', 'Wrong security answer; increasing security answer attempts', error);
        await sqlInterface.increaseSecurityAnswerAttempt(requestObject);
        return new OpalSecurityResponseSuccess(answerNotVerified, requestKey, requestObject);
    }

    // Confirm the validity of the answer by checking its decrypted value in the request parameters.
    let answerValid = unencrypted.Answer === user.SecurityAnswer;
    let isVerified;

    // Use of RAMQ (SSN) in password reset requests is no longer supported after 1.12.2 (QSCCD-476)
    if (unencrypted.PasswordReset && Version.versionLessOrEqual(requestObject.AppVersion, Version.version_1_12_2)) {
        let ssnValid = unencrypted.SSN && unencrypted.SSN.toUpperCase() === user.SSN;
        isVerified = ssnValid && answerValid;
    }
    else isVerified = answerValid;

    if (!isVerified) {
        return new OpalSecurityResponseSuccess(answerNotVerified, requestKey, requestObject);
    }

    await sqlInterface.setTrusted(requestObject);
    await sqlInterface.resetSecurityAnswerAttempt(requestObject);
    return new OpalSecurityResponseSuccess(answerVerified, requestKey, requestObject);
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

    logger.log('debug', `Running function setNewPassword for username = ${user.Username}`);

    try {
        let unencrypted = await utility.decrypt(requestObject.Parameters, secret, answer);
        await sqlInterface.setNewPassword(utility.hash(unencrypted.newPassword), user.Username);

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

async function getUserPatientSecurityInfo(requestKey, requestObject) {
    let rows = await sqlInterface.getUserPatientSecurityInfo(requestObject);
    if (rows.length !== 1) {
        logger.log('error', `getUserPatientSecurityInfo returned ${rows.length} rows when it should have returned 1`);
        let errMessage = rows.length === 0
            ? 'Failed to find user/patient record'
            : 'Possible injection attack; too many patient records returned';
        throw new OpalSecurityResponseError(CODE.SERVER_ERROR, errMessage, requestKey, requestObject);
    }
    let userPatient = rows[0];

    // Validate that the returned security info has values for all required parameters
    let requiredParams = ['Email', 'SecurityAnswer', 'Attempt'];
    requiredParams.forEach(param => {
        if (userPatient[param] === null || userPatient[param] === '') {
            throw new OpalSecurityResponseError(CODE.SERVER_ERROR, `Query for ${param} did not return a value`, requestKey, requestObject);
        }
    });
    return userPatient;
}
