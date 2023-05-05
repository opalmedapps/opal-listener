const logger = require('./../logs/logger');
const firebase = require('firebase-admin');
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
const passwordResetSuccess = { PasswordReset: "true" };


exports.verifySecurityAnswer = async (requestKey, requestObject) => {
    logger.log('info', `Verifying security answer for username ${requestObject?.UserID}`);

    // Special case used to set the request's UserID in the case of password reset requests
    await ensureUserIdAvailable(requestObject);

    // Get security info needed to verify the answer, including the cached answer from PatientDeviceIdentifier.
    let user = await getUserPatientSecurityInfo(requestKey, requestObject);

    // Handle security answer attempts (resetting the attempts, or blocking the user after too many attempts)
    await handleTooManyAttempts(requestKey, requestObject, user);

    let unencrypted;
    // An error caught during decryption indicates an incorrect security answer
    try {
        logger.log('debug', 'Attempting decryption to verify security answer');
        unencrypted = await utility.decrypt(requestObject.Parameters, user.SecurityAnswer);
    }
    catch (error) {
        logger.log('error', 'Wrong security answer (from decryption failure); increasing security answer attempts', error);
        await sqlInterface.increaseSecurityAnswerAttempt(requestObject);
        return new OpalSecurityResponseSuccess(answerNotVerified, requestKey, requestObject);
    }

    // As an additional confirmation, validate that the provided answer (once decrypted) matches the expected value
    let isVerified = confirmValidSecurityAnswer(unencrypted, requestObject, user);
    if (!isVerified) {
        logger.log('error', 'Wrong security answer (from verification); increasing security answer attempts');
        return new OpalSecurityResponseSuccess(answerNotVerified, requestKey, requestObject);
    }

    await sqlInterface.setTrusted(requestObject);
    await sqlInterface.resetSecurityAnswerAttempt(requestObject);
    return new OpalSecurityResponseSuccess(answerVerified, requestKey, requestObject);
};

async function handleTooManyAttempts(requestKey, requestObject, user) {
    // Reset the attempts if the timeout was reached
    if (user.TimeoutTimestamp != null && requestObject.Timestamp - (new Date(user.TimeoutTimestamp)).getTime() > FIVE_MINUTES) {
        logger.log('verbose', `Resetting number of security answer attempts for username ${requestObject?.UserID}`);
        await sqlInterface.resetSecurityAnswerAttempt(requestObject);
    }
    // If 5 failed attempts have been made, lock the user out for 5 minutes
    else if (user.Attempt === 5) {
        logger.log('verbose', `Blocking user after reaching 5 security answer attempts for username ${requestObject?.UserID}`);
        if (user.TimeoutTimestamp == null) await sqlInterface.setTimeoutSecurityAnswer(requestObject, requestObject.Timestamp);
        throw new OpalSecurityResponseError(CODE.TOO_MANY_ATTEMPTS, "Attempted and failed security answer 5 times", requestKey, requestObject);
    }
}

function confirmValidSecurityAnswer(unencryptedParams, requestObject, user) {
    // Confirm the validity of the answer by checking its decrypted value in the request parameters.
    let answerValid = unencryptedParams.Answer === user.SecurityAnswer;
    let isVerified;

    // Use of RAMQ (SSN) in password reset requests (which also verify a security answer) is no longer supported after 1.12.2 (QSCCD-476)
    if (unencryptedParams.PasswordReset && Version.versionLessOrEqual(requestObject.AppVersion, Version.version_1_12_2)) {
        let ssnValid = unencryptedParams.SSN && unencryptedParams.SSN.toUpperCase() === user.SSN;
        isVerified = ssnValid && answerValid;
    }
    else isVerified = answerValid;
    return isVerified;
}

exports.setNewPassword = async function(requestKey, requestObject) {
    logger.log('info', `Running function setNewPassword for username = ${requestObject.UserID}`);

    // Special case used to set the request's UserID in the case of password reset requests
    await ensureUserIdAvailable(requestObject);

    // Get security info needed to set a new password
    let user = await getUserPatientSecurityInfo(requestKey, requestObject);

    try {
        // Use of RAMQ (SSN) to encrypt password reset requests is no longer supported after 1.12.2 (QSCCD-476)
        let secret = Version.versionGreaterThan(requestObject.AppVersion, Version.version_1_12_2)
            ? utility.hash(user.Email)
            : utility.hash(user.SSN.toUpperCase());
        let answer = user.SecurityAnswer;

        let unencrypted = await utility.decrypt(requestObject.Parameters, secret, answer);
        await sqlInterface.setNewPassword(utility.hash(unencrypted.newPassword), user.Username);

        logger.log('verbose', `Successfully updated password for username = ${requestObject.UserID}`);
        return new OpalSecurityResponseSuccess(passwordResetSuccess, requestKey, requestObject);
    }
    catch(err) {
        let errMsg = "Error changing the user's password"
        logger.log('error', errMsg, err);
        throw new OpalSecurityResponseError(CODE.SERVER_ERROR, errMsg, requestKey, requestObject);
    }
};

exports.getSecurityQuestion = async function(requestKey, requestObject) {
    let unencrypted = await utility.decrypt(requestObject.Parameters, utility.hash("none"));
    logger.log('debug', `Unencrypted: ${JSON.stringify(unencrypted)}`);

    // Special case used to set the request's UserID in the case of password reset requests
    await ensureUserIdAvailable(requestObject);

    try {
        logger.log('verbose', `Updating device identifiers for user ${requestObject.UserID}`);
        requestObject.Parameters = unencrypted;
        await sqlInterface.updateDeviceIdentifier(requestObject);

        logger.log('verbose', `Getting security question for user ${requestObject.UserID}`);
        let response = await sqlInterface.getSecurityQuestion(requestObject);
        return new OpalSecurityResponseSuccess(response.Data, requestKey, requestObject);
    }
    catch(error) {
        let errMsg = 'Error getting a security question for the user';
        logger.log('error', errMsg, error);
        throw new OpalSecurityResponseError(CODE.SERVER_ERROR, errMsg, requestKey, requestObject);
    }
};

async function getUserPatientSecurityInfo(requestKey, requestObject) {
    let rows = await sqlInterface.getUserPatientSecurityInfo(requestObject);
    if (rows.length !== 1) {
        logger.log('error', `getUserPatientSecurityInfo returned ${rows.length} rows when it should have returned 1`);
        let errMessage = rows.length === 0
            ? 'Failed to find user/patient record'
            : 'Possible injection attack; too many patient records returned';
        throw new OpalSecurityResponseError(CODE.AUTHENTICATION_ERROR, errMessage, requestKey, requestObject);
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

//
/**
 * @desc Ensures that a requestObject has a non-empty UserID parameter, and if not, initializes it.
         This is required specifically when requesting a security answer for a password reset,
         because during such a request, the app does not yet have access to the user's Firebase UID.
         This function looks up the UID value via firebase-admin's auth tool.
         Note: this function modifies the original requestObject.
 * @author Stacey Beard
 * @date 2023-05-04
 * @param requestObject The security request object to check.
 * @returns {Promise<void>} Resolves if the addition was successful or if a UserID was already provided.
 */
async function ensureUserIdAvailable(requestObject) {
    if (requestObject.UserID) return;
    let userRecord = await firebase.auth().getUserByEmail(requestObject.UserEmail);
    requestObject.UserID = userRecord?.uid;
    if (!requestObject.UserID) throw 'Failed to look up and set UserID value using the firebase admin tool; no value returned';
}
