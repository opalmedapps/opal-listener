/**  Library Imports **/

var sqlInterface = require('../api/sql/sqlInterface.js');
var firebaseFunction = require('../api/firebase/firebaseFunctions.js');
var CryptoJS = require("crypto-js");
const config = require('../config-adaptor');
const opalRequest = require('./request/request.js');
const logger = require('../logs/logger.js');
const request = require('request');
const path = require('path');
const fs = require('fs');

const { sendMail } = require('./utility/mail.js');

/**
 * @description check the user is caregiver or not
 * @param {object} requestObject - The calling request's requestObject.
 * @returns {status: number}
 * @throws Throws an error if a required field is not present in the given request.
 */
exports.isCaregiverAlreadyRegistered = async function(requestObject) {
    try {
        logger.log('info', `Verifying user account for id token: ${requestObject?.Parameters?.Fields?.token}`);

        const token = requestObject?.Parameters?.Fields?.token;
        const uid = await firebaseFunction.getFirebaseAccountByIdToken(token);

        const result = await opalRequest.isCaregiverAlreadyRegistered(uid);

        return {status: result.status};
    }
    catch (error) {
        logger.log('error', `An error occurred while attempting to verify id token (${token})`, error);

        return { Data: error };
    }
};

/**
 * @description check email exists in firebase or not
 * @param {object} requestObject - The calling request's requestObject.
 * @returns { Data: object}
 * @throws Throws an error if a required field is not present in the given request.
 */
exports.checkEmailExistsInFirebase = async function(requestObject) {
    try {
        logger.log('info', `Checking user account for email: ${requestObject?.Parameters?.Fields?.email}`);

        const email = requestObject?.Parameters?.Fields?.email;
        const uid = await firebaseFunction.getFirebaseAccountByEmail(email);

        return { Data: {uid: uid} };
    }
    catch (error) {
        logger.log('error', `An error occurred while attempting to check email (${requestObject.Parameters.Fields.email}) exists or not`, error);

        return { Data: error };
    }
};

/**
 * @description Register a patient
 * @param {object} requestObject - The calling request's requestObject.
 * @returns {Data: Array}
 * @throws Throws an error if a required field is not present in the given request.
 */
exports.registerPatient = async function(requestObject) {
    const fields = requestObject?.Parameters?.Fields;
    try {
        // Verify User existence
        let {isExistingUser, uid} = await verifyExistingUser(requestObject);
        // Request validation
        const registrationData = await prepareAndValidateRegistrationRequest(requestObject, isExistingUser);

        // Variables
        const isNewPatient = registrationData.patient.legacy_id === null;

        // Registration steps
        const patientLegacyId = await initializeOrGetBasicPatientRow(requestObject, registrationData);
        if (isNewPatient) await initializePatientMRNs(requestObject, registrationData, patientLegacyId);
        uid = await initializeOrGetFirebaseAccount(uid, fields.email, fields.password);
        hashPassword(requestObject);
        let selfPatientSerNum = await initializeOrGetSelfPatient(isExistingUser, requestObject, registrationData, patientLegacyId);
        let userSerNum = await initializeOrGetUser(isExistingUser, registrationData, uid, fields.password, selfPatientSerNum);
        const phone = isExistingUser? undefined : requestObject.Parameters.Fields.phone;
        await updateSelfPatient(requestObject, selfPatientSerNum, phone);
        if (isNewPatient) await initializePatientControl(patientLegacyId);
        await registerInBackend(requestObject, patientLegacyId, userSerNum, uid, isExistingUser);

        // Registration is considered successful at this point.
        // I.e., don't fail the whole registration if an error occurs now and only log an error.
        await sendConfirmationEmailNoFailure(fields.language, fields.email);
        if (isNewPatient) await requestLabHistoryNoFailure(registrationData, patientLegacyId);
        if (isNewPatient) await updatePatientStatusInORMSNoFailure(registrationData);

        // Exact response string expected by the frontend
        return { Data: [{ Result: 'Successfully Update' }]};
    }
    catch (error) {
        logger.log('error', `An error occurred while attempting to register patient (${fields.email})`, error);

        // TODO: Make registration transactional; undo lasting changes after a registration failure (e.g. remove the patient from the DB and Firebase).

        // Avoid showing error details to frontend
        throw 'Error during patient registration. See internal logs for details.';
    }
};

/**
 * @description Verify if the incoming registration request is for a new or existing user
 * @param {object} requestObject The incoming request.
 * @returns {isExistingUser: boolean, uid: string} return a boolean which indicate if the user already exists in system,
 * and the user firebase user id if exists.
 */
async function verifyExistingUser(requestObject) {
    if (requestObject?.Parameters?.Fields?.accessToken !== undefined){
        try {
            const uid = await firebaseFunction.getFirebaseAccountByIdToken(
                requestObject.Parameters.Fields.accessToken,
            );
            const result = await opalRequest.isCaregiverAlreadyRegistered(uid);
            return {
                isExistingUser: result === 200,
                uid: uid,
            };
        }
        catch (error) {
            logger.log('error', `Error while verifying an existing user: ${error}`);
        }
    }
    return {
        isExistingUser: false,
        uid: '',
    };
}

/**
 * @description Validates an incoming registration request, and fetches and validates the additional information from
 *              the backend that's needed to proceed with registration.
 * @param {object} requestObject The incoming request.
 * @param {boolean} isExistingUser Indicate if the user already exists in the backend
 * @returns {Promise<object>} Resolves to an object containing the additional registration details from the backend.
 */
async function prepareAndValidateRegistrationRequest(requestObject, isExistingUser) {
    logger.log('info', `Validating registration request parameters for ${requestObject?.Parameters?.Fields?.email}`);
    validateRegisterPatientRequest(requestObject);

    // Get additional data needed for registration from the backend API
    logger.log('info', 'Calling backend API to get registration details');
    const registrationData = await opalRequest.retrieveRegistrationDataDetailed(
        requestObject.Parameters.Fields.registrationCode,
    );
    validateRegistrationDataDetailed(registrationData);
    if (!isExistingUser) {
        logger.log('info', 'Validating registration request parameters for new user');
        validateNewRegisterPatientRequest(requestObject);
    }

    return registrationData;
}

/**
 * @description Validates the request for the register patient functionality.
 * @param {Object} requestObject - The calling request's requestObject.
 * @returns {void}
 * @throws Throws an error if a required field is not present in the given request.
 */
function validateRegisterPatientRequest(requestObject) {
    if (!requestObject.Parameters || !requestObject.Parameters.Fields) {
        throw 'requestObject is missing Parameters.Fields';
    }

    // Helper function
    let fieldExists = (name) => { return requestObject.Parameters.Fields[name] && requestObject.Parameters.Fields[name] !== "" };

    let requiredFields = [
        'accessLevel',
        'accessLevelSign',
        'accountExists',
        'email',
        'language',
        'password',
        'registrationCode',
        // typo in the frontend
        'termsandAggreementSign',
    ]

    for (let field of requiredFields) {
        if (!fieldExists(field)) {
            throw `Required field '${field}' missing in request fields`;
        }
    }
}

/**
 * @description Validates the detailed registration data returned from the backend.
 * @param registrationData Data object returned when calling the backend's detailed registration endpoint.
 */
function validateRegistrationDataDetailed(registrationData) {
    const errMsg = (details) => `Invalid registration data received from the backend API: ${details}`;
    if (!registrationData) throw new Error(errMsg('data object is not defined'));

    // TODO check nested properties
    let requiredFields = ['caregiver', 'patient', 'hospital_patients', 'relationship_type'];

    for (let field of requiredFields) {
        if (!registrationData[field]) throw new Error(errMsg(`required data field '${field}' is missing`));
    }
}

/**
 * @description Validates the fields for the new register patient functionality.
 * @param {Object} requestObject - The calling request's requestObject.
 * @returns {void}
 * @throws Throws an error if a required field is not present in the given request.
 */
function validateNewRegisterPatientRequest(requestObject) {
    if (!requestObject.Parameters || !requestObject.Parameters.Fields) {
        throw 'requestObject is missing Parameters.Fields';
    }

    // Helper function
    let fieldExists = (name) => { return requestObject.Parameters.Fields[name] && requestObject.Parameters.Fields[name] !== "" };

    let requiredFields = [
        'phone',
        'answer1',
        'answer2',
        'answer3',
        'securityQuestion1',
        'securityQuestion2',
        'securityQuestion3',
        'securityQuestionText1',
        'securityQuestionText2',
        'securityQuestionText3',
    ]

    for (let field of requiredFields) {
        if (!fieldExists(field)) {
            throw `Required field '${field}' missing in request fields`;
        }
    }
}

/**
 * @description Creates a basic (bare-bones) patient row when one doesn't exist.
 *              This row will be updated later in the registration process with more detailed information.
 * @param {object} requestObject The request object.
 * @param {object} registrationData The detailed registration data sent from the backend.
 * @returns {Promise<*>} Resolves to the legacy ID (PatientSerNum) of the new row, or of the old row if it already existed.
 */
async function initializeOrGetBasicPatientRow(requestObject, registrationData) {
    const isNewPatient = registrationData.patient.legacy_id === null;
    let patientLegacyId;
    if (isNewPatient) {
        logger.log('info', 'New patient detected; inserting into OpalDB.Patient');
        patientLegacyId = await insertPatient(requestObject, registrationData.patient);
    }
    else {
        patientLegacyId = registrationData.patient.legacy_id;
        logger.log('info', `Existing patient detected (PatientSerNum = ${patientLegacyId}); skipping insert into OpalDB');`);
    }
    return patientLegacyId;
}

/**
 * @description Inserts the patient's MRNs in the database.
 * @param {object} requestObject The request object.
 * @param {object} registrationData The detailed registration data sent from the backend.
 * @param {number} patientLegacyId The patient's legacy ID (PatientSerNum).
 * @returns {Promise<void>}
 */
async function initializePatientMRNs(requestObject, registrationData, patientLegacyId) {
    logger.log('info', 'New patient; inserting into OpalDB.Patient_Hospital_Identifier');
    for (const hospital_patient of registrationData?.hospital_patients) {
        await insertPatientHospitalIdentifier(requestObject, hospital_patient, patientLegacyId);
    }
}

/**
 * @description Fetches the user's Firebase account, or creates a new one if it doesn't exist yet.
 * @param {boolean} existingUserUid The user id if it's an existing user in firebase.
 * @param email The user's email address.
 * @param password The user's password, used when creating a new account.
 * @returns {Promise<*>} Resolves to the user's Firebase UID.
 */
async function initializeOrGetFirebaseAccount(existingUserUid, email, password) {
    let uid;
    if (!existingUserUid) {
        // The user's decrypted password is required to create a new Firebase account
        uid = await firebaseFunction.createFirebaseAccount(email, password);
        logger.log('info', `Created new firebase user account: ${uid}`);
    }
    else {
        uid = existingUserUid;
        logger.log('info', `Got existing firebase user account: ${uid}`);
    }
    return uid;
}

/**
 * @description Registers the user in the backend by sending it the missing field values it needs to complete
 *              the registration. For example, the security answers provided by the user (along with other information)
 *              must be sent there and saved.
 * @param requestObject The request object.
 * @param patientLegacyId The patient's legacy ID (PatientSerNum).
 * @param userLegacyId The user's legacy ID (UserSerNum).
 * @param uid The user's Firebase UID.
 * @param {boolean} isExistingUser Indicate if the user already exists in the backend
 * @returns {Promise<void>}
 */
async function registerInBackend(requestObject, patientLegacyId, userLegacyId, uid, isExistingUser) {
    const registerData = formatRegisterData(requestObject, uid, patientLegacyId, userLegacyId, isExistingUser);
    await opalRequest.registrationRegister(requestObject.Parameters.Fields.registrationCode, registerData, isExistingUser);
}

/**
 * @description Hashes the user's password and reassigns it to the requestObject.
 * @param requestObject The request object.
 */
function hashPassword(requestObject) {
    requestObject.Parameters.Fields.password = CryptoJS.SHA512(requestObject.Parameters.Fields.password).toString();
}

/**
 * @description Makes sure the registering user has a "self" row in the Patient table.
 *              If the registration is for a self user who doesn't have a patient row yet, creates a dummy row.
 *              Otherwise, we rely on the legacy ID that identifies their existing Patient row.
 * @param {boolean} isExistingUser Indicate if the user already exists in the backend
 * @param requestObject
 * @param {object} registrationData The detailed registration data sent from the backend.
 * @param patientLegacyId
 * @returns {Promise<*>} Resolves to the legacy ID (PatientSerNum) of the user in the Patient table.
 */
async function initializeOrGetSelfPatient(isExistingUser, requestObject, registrationData, patientLegacyId) {
    const isSelfRegistration = registrationData.relationship_type.role_type === "SELF";

    let selfPatientSerNum;
    if (isExistingUser) {
        selfPatientSerNum = await sqlInterface.getPatientSerNumFromUserSerNum(registrationData.caregiver.legacy_id);
    }
    // Special case: when it's a new caregiver who isn't registering for self, we need to create a dummy self patient row
    else if (!isSelfRegistration) {
        selfPatientSerNum = await sqlInterface.insertDummyPatient(
            registrationData.caregiver.first_name,
            registrationData.caregiver.last_name,
            requestObject.Parameters.Fields.email,
            requestObject.Parameters.Fields.language,
        );
    }
    else {
        selfPatientSerNum = patientLegacyId;
    }
    return selfPatientSerNum;
}

/**
 * @description Makes sure the registering caregiver has a row in the Users table.
 *              If the registration is for a new caregiver who doesn't have a users row yet, creates one.
 *              Otherwise, we rely on the legacy ID that identifies their existing Users row.
 * @param {boolean} [isExistingUser Indicate if the user already exists in the backend
 * @param {object} registrationData The detailed registration data sent from the backend.
 * @param {string} uid The user's Firebase UID.
 * @param {string} password The user's password.
 * @param {number} selfPatientSerNum The PatientSerNum that represents the user's "self" row in the Patient table.
 * @returns {Promise<*>} Resolves to the legacy ID (UserSerNum) of the user in the Users table.
 */
async function initializeOrGetUser(isExistingUser, registrationData, uid, password, selfPatientSerNum) {
    const isSelfRegistration = registrationData.relationship_type.role_type === "SELF";
    const userType = isSelfRegistration ? 'Patient' : 'Caregiver';

    let userSerNum;
    if (!isExistingUser) userSerNum = await sqlInterface.insertUser(uid, password, selfPatientSerNum, userType);
    else userSerNum = registrationData.caregiver.legacy_id;
    return userSerNum;
}

async function updateSelfPatient(requestObject, selfPatientSerNum, phone) {
    await sqlInterface.updateSelfPatient(requestObject, selfPatientSerNum, phone);
}

async function initializePatientControl(patientSerNum) {
    await sqlInterface.initializePatientControl(patientSerNum);
}

async function sendConfirmationEmailNoFailure(language, emailAddress) {
    try {
        let {subject, body, htmlStream} = getEmailContent(language);
        await sendMail(config, emailAddress, subject, body.join('\n'), htmlStream);
    }
    catch (error) {
        logger.log('error', `An error occurred while sending the confirmation email (for ${emailAddress})`, error);
    }
}

/**
 * @description Calls the lab results history endpoint to trigger collection of a patient's historical lab data.
 *              Errors that occur during this function's execution are logged and suppressed.
 *              Note: If the patient already exists in the system, execution is skipped and historical labs are not requested.
 * @param {object} registrationData The detailed registration data sent from the backend.
 * @param patientLegacyId
 * @returns {Promise<void>}
 */
async function requestLabHistoryNoFailure(registrationData, patientLegacyId) {
    try {
        for (const hospital_patient of registrationData?.hospital_patients) {
            const requestData = {
                PatientId: hospital_patient.mrn,
                Site: hospital_patient.site_code,
            }
            await opalRequest.getLabResultHistory(config.LAB_RESULT_HISTORY_URL, requestData);
        }
    } catch (error) {
        logger.log('error', `An error occurred while getting lab result history (for patient ${patientLegacyId})`, error);
    }
}

/**
 * @description Calls the endpoint to update a patient's Opal status in ORMS.
 *              Errors that occur during this function's execution are logged and suppressed.
 *              Note: If the patient already exists in the system, execution is skipped and ORMS status is not updated.
 * @param {object} registrationData The detailed registration data sent from the backend.
 * @returns {Promise<void>}
 */
async function updatePatientStatusInORMSNoFailure(registrationData) {
    try {
        await updatePatientStatusInORMS(registrationData);
    }
    catch (error) {
        logger.log('error', `An error occurred while updating the patient status via direct call to ORMS (for patient UUID ${registrationData.patient.uuid})`, error);
    }
}

/**
 * @description Makes a POST call to the Online Room Management System (ORMS) to update the patient's Opal status.
 *              Tries calling ORMS using each of the patient's MRNs until one succeeds.
 * @param registrationData The detailed registration data from the backend.
 * @returns {Promise<void>} Resolves if at least one of the call succeeds; otherwise, rejects with an error.
 */
async function updatePatientStatusInORMS(registrationData) {
    let success, lastError;

    // Attempt a call on each of the patient's MRNs on a loop until one of the calls is successful
    for (let {mrn, site} of registrationData.hospital_patients) {
        let logMsg = message => `${message} for mrn = ${mrn}, site = ${site}`;
        try {
            let options = {
                url: config.ORMS_UPDATE_PATIENT_STATUS_URL,
                json: true,
                body: {
                    "mrn": mrn,
                    "site": site,
                    "opalStatus": 1,  // 1 => registered/active patient; 0 => unregistered/inactive patient
                    "opalUUID": registrationData.patient.uuid,
                },
            };

            logger.log('info', logMsg(`Updating patient's Opal status in ORMS`));
            await postPromise(options);
            logger.log("verbose", logMsg(`Success updating patient's ORMS status`));
            success = true;
            break;
        }
        catch (error) {
            logger.log("verbose", logMsg(`Error during attempt to update patient's ORMS status`));
            lastError = error;
        }
    }
    if (!success) throw lastError;
}

/**
 * @description Promise wrapper for the request.post function.
 * @param {Object} options - The options required by request.post.
 * @returns {Promise<*>} Resolves on success of the post call, or rejects with an error.
 */
function postPromise(options) {
    return new Promise((resolve, reject) => {
        request.post(options, function(err, response, body) {
            logger.log('verbose', 'Post response: ' + JSON.stringify(response));
            logger.log('verbose', 'Post body: ' + JSON.stringify(body));

            if (err) reject(err);
            else if (response.statusCode !== 200) {
                reject(`Request returned with a response status other than '200 OK': status = ${response.statusCode}, body = ${JSON.stringify(body)}`);
            }
            else resolve();
        });
    });
}

/**
 * @description Returns the subject, body and HTML stream of the registration email in the given language.
 * @param {string} language - The two-character (capitalized) string of the language to send the email in.
 * @returns {Object} Returns an object with subject, body and html stream.
 * @throws Throws an error if the given language is not supported.
 */
function getEmailContent(language) {
    let data;
    let htmlStream;
    const languageChoice = language.toUpperCase();

    if (languageChoice === 'EN') {
        data = require('../email/confirmation_en.json');
        htmlStream = fs.createReadStream(path.resolve(__dirname, '../email/confirmation_en.html'));
    }
    else if (languageChoice === 'FR') {
        data = require('../email/confirmation_fr.json');
        htmlStream = fs.createReadStream(path.resolve(__dirname, '../email/confirmation_fr.html'));
    }
    else {
        throw `No email content for language '${languageChoice}' available`;
    }

    data.htmlStream = htmlStream

    return data;
}

/**
 * @description Formats the data expected by the backend API for completing registration.
 * @param {Object} requestObject - The calling request's requestObject.
 * @param {string} firebaseUsername - The caregiver's Firebase username.
 * @param {int} patientLegacyId - The legacy ID of the patient (PatientSerNum).
 * @param {int} userLegacyId - The legacy ID of the user (UserSerNum).
 * @param {boolean} isExistingUser Indicate if the user already exists in the backend
 * @returns {Object} registerData {
        patient: {
	 		legacy_id: int
	 	},
        caregiver: {
            language: str,
            phone_number: str,
        },
        security_answers: [
            {
                question: str,
                answer: str,
            },
        ],
 * }
 */
function formatRegisterData(requestObject, firebaseUsername, patientLegacyId, userLegacyId, isExistingUser) {
    let registerData;
    if (!isExistingUser) {
        registerData = {
            'patient': {
                'legacy_id': patientLegacyId,
            },
            'caregiver': {
                'language': requestObject.Parameters.Fields.language,
                'phone_number': requestObject.Parameters.Fields.phone,
                'username': firebaseUsername,
                'email': requestObject.Parameters.Fields.email,
                'legacy_id': userLegacyId,
            },
            'security_answers': [
                {
                    'question': requestObject.Parameters.Fields.securityQuestionText1,
                    'answer': requestObject.Parameters.Fields.answer1,
                },
                {
                    'question': requestObject.Parameters.Fields.securityQuestionText2,
                    'answer': requestObject.Parameters.Fields.answer2,
                },
                {
                    'question': requestObject.Parameters.Fields.securityQuestionText3,
                    'answer': requestObject.Parameters.Fields.answer3,
                },
            ],
        };
    }
    else {
        registerData = {
            'patient': {
                'legacy_id': patientLegacyId,
            },
            'caregiver': {
                'language': requestObject.Parameters.Fields.language,
                'username': firebaseUsername,
                'legacy_id': userLegacyId,
            },
        };
    }
    return registerData;
}

/**
 * @description insert patient with request parameters.
 * @param {Object} requestObject - The calling request's requestObject.
 * @param {Object} patient - patient object.
 * @returns {patientSerNum}
 */
async function insertPatient(requestObject, patient) {
    requestObject.Parameters.Fields.firstName = patient.first_name;
    requestObject.Parameters.Fields.lastName = patient.last_name;
    requestObject.Parameters.Fields.sex = patient.sex;
    requestObject.Parameters.Fields.dateOfBirth = patient.date_of_birth;
    requestObject.Parameters.Fields.ramq = patient.ramq;
    return await sqlInterface.insertPatient(requestObject);
}

/**
 * @description insert patient hospital indetifier with request parameters.
 * @param {Object} requestObject - The calling request's requestObject.
 * @param {Object} hospitalPatient - hospitalPatient object.
 * @param {int} patientSerNum - legacy patient id.
 * @returns {void}
 */
async function insertPatientHospitalIdentifier(requestObject, hospitalPatient, patientSerNum) {
    if (!hospitalPatient) {
        const registrationCode = requestObject.Parameters.Fields.registrationCode;
        throw  `Failed to insert Patient to legacyDB due to hospitalPatient not exists with registrationCode: ${registrationCode}`;
    }
    requestObject.Parameters.Fields.patientSerNum = patientSerNum;
    requestObject.Parameters.Fields.mrn = hospitalPatient.mrn;
    requestObject.Parameters.Fields.site = hospitalPatient.site_code;
    return await sqlInterface.insertPatientHospitalIdentifier(requestObject);
}
