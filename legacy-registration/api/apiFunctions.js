/**  Library Imports **/

var firebaseFunction = require('../api/firebase/firebaseFunctions.js');
const opalRequest = require('./request/request.js');
const logger = require('../logs/logger.js');

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
        const decodedToken = await firebaseFunction.getFirebaseAccountByIdToken(token);

        const result = await opalRequest.isCaregiverAlreadyRegistered(decodedToken.uid);

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
        let {isExistingUser, decodedToken} = await verifyExistingUser(requestObject);
        // Request validation
        prepareAndValidateRegistrationRequest(requestObject, isExistingUser);

        let uid;
        let email = undefined;

        if (decodedToken) {
            uid = decodedToken.uid;
            email = decodedToken.email;
        } else {
            // The user's decrypted password is required to create a new Firebase account
            uid = await firebaseFunction.createFirebaseAccount(fields.email, fields.password);
            logger.log('info', `Created new firebase user account: ${uid}`);
            // in this case the email has to be verified via email verification
        }

        await registerInBackend(requestObject, email, uid, isExistingUser);

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
 * @returns {isExistingUser: boolean, decodedToken: DecodedIdToken} return a boolean which indicate if the user already exists in system,
 * and the decoded Firebase token.
 */
async function verifyExistingUser(requestObject) {
    if (requestObject?.Parameters?.Fields?.accessToken !== undefined){
        try {
            const decodedToken = await firebaseFunction.getFirebaseAccountByIdToken(
                requestObject.Parameters.Fields.accessToken,
            );
            const result = await opalRequest.isCaregiverAlreadyRegistered(decodedToken.uid);
            return {
                isExistingUser: result.status === 200,
                decodedToken: decodedToken,
            };
        }
        catch (error) {
            logger.log('error', `Error while verifying an existing user: ${error}`);
        }
    }
    return {
        isExistingUser: false,
        decodedToken: null,
    };
}

/**
 * @description Validates an incoming registration request, and fetches and validates the additional information from
 *              the backend that's needed to proceed with registration.
 * @param {object} requestObject The incoming request.
 * @param {boolean} isExistingUser Indicate if the user already exists in the backend
 * @returns {void}
 */
function prepareAndValidateRegistrationRequest(requestObject, isExistingUser) {
    logger.log('info', `Validating registration request parameters for ${requestObject?.Parameters?.Fields?.email}`);
    validateRegisterPatientRequest(requestObject);

    if (!isExistingUser) {
        logger.log('info', 'Validating registration request parameters for new user');
        validateNewRegisterPatientRequest(requestObject);
    }
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
 * @description Registers the user in the backend by sending it the missing field values it needs to complete
 *              the registration. For example, the security answers provided by the user (along with other information)
 *              must be sent there and saved.
 * @param requestObject The request object.
 * @param email The user's email.
 * @param uid The user's Firebase UID.
 * @param {boolean} isExistingUser Indicate if the user already exists in the backend
 * @returns {Promise<void>}
 */
async function registerInBackend(requestObject, email, uid, isExistingUser) {
    const registerData = formatRegisterData(requestObject, uid, email, isExistingUser);
    await opalRequest.registrationRegister(requestObject.Parameters.Fields.registrationCode, registerData, isExistingUser);
}

/**
 * @description Formats the data expected by the backend API for completing registration.
 * @param {Object} requestObject - The calling request's requestObject.
 * @param {string} firebaseUsername - The caregiver's Firebase username.
 * @param {string} email - The email of the user.
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
function formatRegisterData(requestObject, firebaseUsername, email, isExistingUser) {
    let registerData;
    if (!isExistingUser) {
        registerData = {
            'caregiver': {
                'language': requestObject.Parameters.Fields.language,
                'phone_number': requestObject.Parameters.Fields.phone,
                'username': firebaseUsername,
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

        // to handle the case of an existing user (with a Firebase account) registering at a new institution
        if (email) {
            registerData.caregiver.email = email;
        }
    }
    else {
        registerData = {
            'caregiver': {
                'language': requestObject.Parameters.Fields.language,
                'username': firebaseUsername,
            },
        };
    }
    return registerData;
}
