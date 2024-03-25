const logger = require('./../logs/logger');
const firebase = require('firebase-admin');
const sqlInterface = require('./../api/sqlInterface.js');
const utility = require('./../utility/utility.js');
const { Version } = require('../../src/utility/version');
const OpalResponse = require('../api/response/response');
const OpalSecurityResponseError = require('../api/response/security-response-error');
const OpalSecurityResponseSuccess = require('../api/response/security-response-success');

const FIVE_MINUTES = 300000;

// Available Opal response error codes
const CODE = OpalResponse.CODE;

// Commonly returned responses
const answerVerified = { AnswerVerified: "true" };
const answerNotVerified = { AnswerVerified: "false" };
const passwordResetSuccess = { PasswordReset: "true" };

/**
 * @desc Verifies a security answer provided by the user. Notably, if the request parameters fail to decrypt,
 *       then this is one indication that the wrong answer may have been provided (and used to encrypt the request).
 * @param {string} requestKey The key (branch) onto which this request was pushed on Firebase.
 * @param {object} requestObject The security request made by the app.
 * @returns {Promise<OpalSecurityResponseSuccess>} Resolves if the request successfully completes, whether the answer
 *                                                 is correct or not. The returned object indicates via 'AnswerVerified'
 *                                                 whether the user's provided answer was correct or incorrect.
 */
exports.verifySecurityAnswer = async (requestKey, requestObject) => {
    // Special case used to set the request's UserID in the case of password reset requests
    await ensureUserIdAvailable(requestObject);

    logger.log('info', `Verifying security answer for username ${requestObject?.UserID}`);

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

/**
 * @desc Helper function used by verifySecurityAnswer to handle behavior related to too many security answer attempts.
 *       This function resets the too-many-attempts timeout when applicable, and instigates the timeout when the user
 *       reaches 5 failed attempts.
 * @param {string} requestKey The key (branch) onto which this request was pushed on Firebase.
 * @param {object} requestObject The security request made by the app.
 * @param {object} user The user/patient object returned by getUserPatientSecurityInfo.
 * @returns {Promise<void>} Resolves if no issues occur, or rejects with an OpalSecurityResponseError.
 */
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

/**
 * @desc Helper function used by verifySecurityAnswer to provide a second level of verification of a security answer.
 *       While verifySecurityAnswer first checks for decryption success, this function then checks that the 'Answer' provided
 *       in the request params matches the expected one.
 *       Also contains a legacy check of the SSN value provided until version 1.12.2.
 * @param {object} unencryptedParams The request params, after decryption.
 * @param {object} requestObject The security request made by the app.
 * @param {object} user The user/patient object returned by getUserPatientSecurityInfo.
 * @returns {boolean} Returns true if the second validation passes; false otherwise.
 */
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

/**
 * @desc Function used during a password reset request (non-logged-in) to change the user's password.
 * @param {string} requestKey The key (branch) onto which this request was pushed on Firebase.
 * @param {object} requestObject The security request made by the app.
 * @returns {Promise<OpalSecurityResponseSuccess>} Resolves if the password was successfully changed,
 *                                                 or rejects with an OpalSecurityResponseError.
 */
exports.resetPassword = async function(requestKey, requestObject) {
    // Special case used to set the request's UserID in the case of password reset requests
    await ensureUserIdAvailable(requestObject);

    logger.log('info', `Running function resetPassword for username = ${requestObject.UserID}`);

    // Get security info needed to set a new password
    let user = await getUserPatientSecurityInfo(requestKey, requestObject);

    try {
        // Use of RAMQ (SSN) to encrypt password reset requests is no longer supported after 1.12.2 (QSCCD-476)
        let secret = Version.versionGreaterThan(requestObject.AppVersion, Version.version_1_12_2)
            ? utility.hash(requestObject.UserEmail)
            : utility.hash(user.SSN.toUpperCase());

        // Temporary code for compatibility with app version 1.12.2
        let useLegacySettings = Version.versionLessOrEqual(requestObject.AppVersion, Version.version_1_12_2);

        let answer = user.SecurityAnswer;

        let unencrypted = await utility.decrypt(requestObject.Parameters, secret, answer, 'temp', useLegacySettings);
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

/**
 * @desc Gets a security question from the backend to be shown to the user, and caches their answer for use in the listener.
 *       The cached answer will be used to decrypt all responses during the user's current session.
 *       This function is also called during the password reset process, where a security question is also presented.
 * @param {string} requestKey The key (branch) onto which this request was pushed on Firebase.
 * @param {object} requestObject The security request made by the app.
 * @returns {Promise<OpalSecurityResponseSuccess>} Resolves to an object containing the security question,
 *                                                 or rejects with an OpalSecurityResponseError.
 */
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

/**
 * @desc Helper function used to get the user/patient information required for any security request in this file.
 *       See the SQL query called for details on the returned values.
 * @param {string} requestKey The key (branch) onto which the request was pushed on Firebase.
 * @param {object} requestObject The security request made by the app.
 * @returns {Promise<object>} Resolves to an object containing all required attributes for the user/patient,
 *                            or rejects with a OpalSecurityResponseError if a single record cannot be found,
 *                            or if any essential values are missing.
 */
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
    let requiredParams = ['SecurityAnswer', 'Attempt'];
    requiredParams.forEach(param => {
        if (userPatient[param] === null || userPatient[param] === '') {
            throw new OpalSecurityResponseError(CODE.SERVER_ERROR, `Query for ${param} did not return a value`, requestKey, requestObject);
        }
    });
    return userPatient;
}

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
