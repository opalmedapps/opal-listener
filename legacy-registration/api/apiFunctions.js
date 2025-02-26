/**  Library Imports **/

var sqlInterface = require('../api/sql/sqlInterface.js');
var firebaseFunction = require('../api/firebase/firebaseFunctions.js');
const admin = require("firebase-admin");
var CryptoJS = require("crypto-js");
const utility = require('./utility/utility.js');
const config = require('../config-adaptor');
const opalRequest = require('./request/request.js');
const logger = require('../logs/logger.js');
const request = require('request');
const ssl = require('../security/ssl.js');
const path = require('path');
const fs = require('fs');

const Q = require('q');
const { sendMail } = require('./utility/mail.js');

/**
 * @description Insert user IP address.
 * @param {Object} requestObject - The calling request's requestObject.
 * @returns {Promise<void>} Resolves if the call completes successfully, or rejects with an error.
 */
exports.insertIPLog = function (requestObject) {
    return new Promise((resolve, reject) => {

        sqlInterface.insertIPLog(requestObject).then((members) => {
            resolve({ Data: members });
        }).catch((err) => reject({ Response: error, Reason: err }));

    });
};

/**
 * @description Validate user IP address.
 * @param {Object} requestObject - The calling request's requestObject.
 * @returns {Promise<void>} Resolves if the call completes successfully, or rejects with an error.
 */
exports.validateIP = function (requestObject) {
    return new Promise((resolve, reject) => {
        sqlInterface.validateIP(requestObject).then((members) => {
            resolve({ Data: members });
        }).catch((err) => reject({ Response: error, Reason: err }));
    });
};

/**
 * @description Validate user input and search the user.
 * @param {Object} requestObject - The calling request's requestObject.
 * @returns {Promise<void>} Resolves if the call completes successfully, or rejects with an error.
 */
exports.validateInputs = function (requestObject) {
    return new Promise((resolve, reject) => {
        sqlInterface.validateInputs(requestObject).then((members) => {
            resolve({ Data: members });
        }).catch((err) => reject({ Response: error, Reason: err }));
    });
};

/**
 * @description Get all security questions.
 * @param {Object} requestObject - The calling request's requestObject.
 * @returns {Promise<void>} Resolves if the call completes successfully, or rejects with an error.
 */
exports.getSecurityQuestionsList = function (requestObject) {
    return new Promise((resolve, reject) => {
        sqlInterface.getSecurityQuestionsList(requestObject).then((members) => {
            resolve({ Data: members });
        }).catch((err) => reject({ Response: error, Reason: err }));
    });
};

/**
 * @description Fetch the Opal level of accesss list.
 * @param {Object} requestObject - The calling request's requestObject.
 * @returns {Promise<void>} Resolves if the call completes successfully, or rejects with an error.
 */
exports.getAccessLevelList = function (requestObject) {
    return new Promise((resolve, reject) => {
        sqlInterface.getAccessLevelList(requestObject).then((members) => {
            resolve({ Data: members });
        }).catch((err) => reject({ Response: 'error', Reason: err }));
    });
};

/**
 * @description Get the Opal app language list.
 * @param {Object} requestObject - The calling request's requestObject.
 * @returns {Promise<void>} Resolves if the call completes successfully, or rejects with an error.
 */
exports.getLanguageList = function (requestObject) {
    return new Promise((resolve, reject) => {
        sqlInterface.getLanguageList(requestObject).then((members) => {
            resolve({ Data: members });
        }).catch((err) => reject({ Response: error, Reason: err }));
    });
};

/**
 * @description Get the terms and agreement docuemnts.
 * @param {Object} requestObject - The calling request's requestObject.
 * @returns {Promise<void>} Resolves if the call completes successfully, or rejects with an error.
 */
exports.getTermsandAgreementDocuments = function (requestObject) {
    return new Promise((resolve, reject) => {
        sqlInterface.getTermsandAgreementDocuments(requestObject).then((members) => {
            resolve({ Data: members });
        }).catch((err) => reject({ Response: error, Reason: err }));
    });
};

/**
 * @description Get a patient data info.
 * @param {Object} requestObject - The calling request's requestObject.
 * @returns { Data: response, Result: result }
 * @throws Throws an error if a required field is not present in the given request.
 */
exports.getPatientInfo = async function(requestObject) {
    let response = undefined;
    let result = 'FAILURE';
    try {
        response = await sqlInterface.getPatient(requestObject);
        if (typeof response[0] == 'object') {
            response = response[0];
            result = 'SUCCESS';
        }
    } catch (error) {
        logger.log('error', `An error occurred while getting patient info (for ${requestObject.Parameters.Fields.ramq}): ${JSON.stringify(error)}`);
    }
    return { Data: response, Result: result };
};

/**
 * @description Register a patient
 * @param {Object} requestObject - The calling request's requestObject.
 * @returns { Data: result}
 * @throws Throws an error if a required field is not present in the given request.
 */
exports.registerPatient = async function(requestObject) {
    try {
        validateRegisterPatientRequest(requestObject);

        const backendApiRequest = {
            registrationCode: requestObject.Parameters.Fields.registrationCode,
            language: requestObject.Parameters.Fields.language,
        };
        // Get patient data from new backend
        const patientData = await opalRequest.retrievePatientDataDetailed(backendApiRequest);

        // Insert patient
        const patientResult = await insertPatient(requestObject, patientData?.patient, patientData?.hospital_patients[0]);
        const legacy_id = patientResult[0].Result;

        // Insert patient hospital identifier
        for (const hospital_patient of patientData?.hospital_patients) {
            await insertPatientHospitalIdentifier(requestObject, hospital_patient, legacy_id);
        }
        // Register patient info to new backend
        const registerData = getRegisterData(requestObject, legacy_id);
        await opalRequest.registrationRegister(backendApiRequest, registerData);

        // Before registering the patient, create their firebase user account with decrypted email and password
        // This is required to store their firebase UID as well
        let email = requestObject.Parameters.Fields.email;
        let uid = '';
        if (requestObject.Parameters.Fields.accountExists == '0') {
            uid = await firebaseFunction.createFirebaseAccount(email, requestObject.Parameters.Fields.password);
            logger.log('info', `Created firebase user account: ${uid}`);
        } else {
            uid = await firebaseFunction.getFirebaseAccountByEmail(email);
            logger.log('info', `Got firebase user account: ${uid}`);
        }

        // Assign the unique ID and encrypted password to the request object
        requestObject.Parameters.Fields.uniqueId = uid;
        requestObject.Parameters.Fields.password = CryptoJS.SHA512(requestObject.Parameters.Fields.password).toString();

        // Register the patient in the database
        logger.log('info', `Registering the patient with these parameters: ${JSON.stringify(requestObject)}`);
        let result = await sqlInterface.registerPatient(requestObject);
        logger.log('debug', `Register patient response: ${JSON.stringify(result)}`);

        // Delete the unique firebase branch
        deleteFirebaseBranch(requestObject.BranchName);

        // Registration is considered successful at this point.
        // I.e., don't fail the whole registration if an error occurs now and only log an error.
        try {
            let {subject, body, htmlStream} = getEmailContent(requestObject.Parameters.Fields.language);
            await sendMail(config.SMTP, email, subject, body.join('\n'), htmlStream);
        }
        catch (error) {
            logger.log('error', `An error occurred while sending the confirmation email (for ${requestObject.Parameters.Fields.email}): ${JSON.stringify(error)}`);
        }

        try {
            for (const hospital_patient of patientData?.hospital_patients) {
                const requestData = {
                    PatientId: legacy_id,
                    Site: hospital_patient.site_code,
                }
                await opalRequest.getLabResultHistory(config.LAB_RESULT_HISTORY, requestData);
            }
        } catch (error) {
            logger.log('error', `An error occurred while getting lab result history (for patient ${legacy_id}): ${JSON.stringify(error)}`);
        }

        try {
            await updatePatientStatusInORMS(requestObject);
        }
        catch (error) {
            logger.log('error', `An error occurred while updating the patient status via OIE (for ${requestObject.Parameters.Fields.email}): ${JSON.stringify(error)}`);
        }

        return { Data: result };
    }
    catch (error) {
        logger.log('error', `An error occurred while attempting to register patient (${requestObject.Parameters.Fields.email}): ${JSON.stringify(error)}`);

        // TODO: Make registration transactional; undo lasting changes after a registration failure (e.g. remove the patient from the DB and Firebase).

        // Avoid showing error details to frontend
        throw {Response: 'error', Reason: 'Error during registering patient: See internal logs for details.'};
    }
};

/**
 * @description Validates the request for the register patient functionality.
 * @param {Object} requestObject - The calling request's requestObject.
 * @returns {void}
 * @throws Throws an error if a required field is not present in the given request.
 */
function validateRegisterPatientRequest(requestObject) {
    if (!requestObject.Parameters || !requestObject.Parameters.Fields) {
        throw 'requestObject is missing Parameters.Fields'
    }

    // Helper function
    let fieldExists = (name) => { return requestObject.Parameters.Fields[name] && requestObject.Parameters.Fields[name] !== "" };

    let requiredFields = [
        'email',
        'password',
        'accessLevel',
        'accessLevelSign',
        'answer1',
        'answer2',
        'answer3',
        'language',
        'securityQuestion1',
        'securityQuestion2',
        'securityQuestion3',
        // typo in the frontend
        'termsandAggreementSign',
        'registrationCode'
    ]

    for (let field of requiredFields) {
        if (!fieldExists(field)) {
            throw `Required field '${field}' missing in request fields`
        }
    }
}

/**
 * @description Makes a post call to the OIE to update the patient's Opal status in ORMS.
 * @param {Object} requestObject - The calling request's requestObject.
 * @returns {Promise<void>} Resolves if the call completes successfully, or rejects with an error.
 */
async function updatePatientStatusInORMS(requestObject) {
    logger.log('info', `Updating the patient's Opal status in ORMS: ${JSON.stringify(requestObject)}`);
    let response = await sqlInterface.getSiteAndMrn(requestObject);

    logger.log('debug', 'POST request to ORMS with data' + JSON.stringify(response[0]));

    // Validate the existence of the api path
    if (!config.OIE.api.url || config.OIE.api.url === "") {
        throw 'No value was provided for OIE url in the config file';
    }
    if (!config.OIE.api.method.updatePatientStatus || config.OIE.api.method.updatePatientStatus === "") {
        throw 'No value was provided for OIE updatePatientStatus method in the config file';
    }
    if (!response || response === []) {
        throw 'No patient mrn and site were provided in the database';
    }

    let options = {
        url: config.OIE.api.url + config.OIE.api.method.updatePatientStatus,
        json: true,
        body: {
            "mrn": response[0].Mrn,
            "site": response[0].Site
        },
    };

    // Add an SSL certificate to the request's options if using https
    if (options.url.includes("https")) ssl.attachCertificate(options);

    logger.log('verbose', `Post request to update the patient's Opal Status in ORMS`);
    await postPromise(options);
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

// Function to delete the firebase branch
function deleteFirebaseBranch(parameter) {

    const db = admin.database();
    const ref = db.ref(config.FIREBASE_ROOT_BRANCH + '/branch/' + parameter);

    return ref.once("value", function (snapshot) {
        if (snapshot.exists()) {
            logger.log('debug', 'Firebase branch exist with these value in snapshot: ' + snapshot.val());
            ref.remove();
        }
    });
};

/**
 * @description Returns the subject, body and HTML stream of the registration email in the given language.
 * @param {string} language - The two-character (capitalized) string of the language to send the email in.
 * @returns {Object} Returns an object with subject, body and html stream.
 * @throws Throws an error if the given language is not supported.
 */
function getEmailContent(language) {
    let data;
    let htmlStream;

    if (language == 'EN') {
        data = require('../email/confirmation_en.json');
        htmlStream = fs.createReadStream(path.resolve(__dirname, '../email/confirmation_en.html'));
    }
    else if (language == 'FR') {
        data = require('../email/confirmation_fr.json');
        htmlStream = fs.createReadStream(path.resolve(__dirname, '../email/confirmation_fr.html'));
    }
    else {
        throw `No email content for language '${language}' available`;
    }

    data.htmlStream = htmlStream

    return data;
}


/**
 * @description Validates the request parameters with expected request fields.
 * @param {Object} requestObject - The calling request's requestObject.
 * @returns {void}
 * @throws Throws an error if a required field is not present in the given request.
 */
function validateRequest(requestObject, requiredFields) {
    if (!requestObject.Parameters || !requestObject.Parameters.Fields) {
        throw 'requestObject is missing Parameters.Fields'
    }
    // Helper function
    let fieldExists = name => requestObject.Parameters.Fields[name] && requestObject.Parameters.Fields[name] !== "";

    for (let field of requiredFields) {
        if (!fieldExists(field)) {
            throw `Required field '${field}' missing in request fields`
        }
    }
}

/**
 * @description getRegisterData.
 * @param {Object} requestObject - The calling request's requestObject.
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

function getRegisterData(requestObject, legacy_id) {
    const registerData = {
        'patient': {
            'legacy_id': legacy_id,
        },
        'caregiver': {
            'language': requestObject.Parameters.Fields.language,
            'phone_number': '+1' + requestObject.Parameters.Fields.phone,
        },
        'security_answers': [
            {
                'question': requestObject.Parameters.Fields.securityQuestion1,
                'answer': requestObject.Parameters.Fields.answer1,
            },
            {
                'question': requestObject.Parameters.Fields.securityQuestion2,
                'answer': requestObject.Parameters.Fields.answer2,
            },
            {
                'question': requestObject.Parameters.Fields.securityQuestion3,
                'answer': requestObject.Parameters.Fields.answer3,
            },
        ],
    };
    return registerData;
}

/**
 * @description insert patient with request parameters.
 * @param {Object} requestObject - The calling request's requestObject.
 * @returns {patientSerNum}
 */
async function insertPatient(requestObject, patient, hospital_patient) {
    if (!patient) {
        const registrationCode = requestObject.Parameters.Fields.registrationCode;
        throw `Failed to insert Patient to legacyDB due to Patient not exists with registrationCode: ${registrationCode}`;
    }
    requestObject.Parameters.Fields.mrn = hospital_patient.mrn;
    requestObject.Parameters.Fields.site = hospital_patient.site_code;
    requestObject.Parameters.Fields.firstName = patient.first_name;
    requestObject.Parameters.Fields.lastName = patient.last_name;
    requestObject.Parameters.Fields.sex = patient.sex;
    requestObject.Parameters.Fields.dateOfBirth = patient.date_of_birth;
    return await sqlInterface.insertPatient(requestObject);
}

/**
 * @description insert patient hospital indetifier with request parameters.
 * @param {Object} requestObject - The calling request's requestObject.
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