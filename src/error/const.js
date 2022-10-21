/**
 * @description Contains contants use to handle error from Django backend, legacy-listener, and new listerner structure.
 *              logMessage: is use by winston logger in the console and the log file.
 *              statusCode and clientMessage: are return to the app to give informations about the error to the client
 *              clientMessage: is associated to a Qplus translation to display the correct message.
 *              encrypt: In somecase we want to return an encryption error message that can't be encrypt
 *                       because of the error.
 */
const ERRORS = {
    SNAPSHOT_VALIDATION: {
        statusCode: 400,
        logMessage: 'Firebase snapshot invalid',
        clientMessage: 'FIREBASE_SNAPSHOT_VALIDATION_ERROR',
        encrypt: false,
    },
    ENCRYPTION_SALT: {
        statusCode: 500,
        logMessage: 'Error getting encryption salt value',
        clientMessage: 'ERROR_ENCRYPTION',
        encrypt: false,
    },
    ENCRYPTION_SECRET: {
        statusCode: 500,
        logMessage: 'Error getting encryption secret value',
        clientMessage: 'ERROR_ENCRYPTION',
        encrypt: false,
    },
    DECRYPTION: {
        statusCode: 500,
        logMessage: 'Error decrypting request',
        clientMessage: 'ERROR_ENCRYPTION',
        encrypt: false,
    },
    ENCRYPTION: {
        statusCode: 500,
        logMessage: 'Error encrypting response',
        clientMessage: 'ERROR_ENCRYPTION',
        encrypt: false,
    },
    DEFAULT_ERROR: {
        statusCode: 500,
        logMessage: 'Unknown listener error',
        clientMessage: 'UNKNOWN_ERROR',
        encrypt: false,
    },
    API_NOT_FOUND: {
        statusCode: 404,
        logMessage: 'Backend path not found',
        clientMessage: 'API_ERROR_NOT_FOUND',
        encrypt: true,
    },
    API_NOT_AVAILABLE: {
        statusCode: 503,
        logMessage: 'Cannot reach backend api',
        clientMessage: 'API_ERROR_NOT_AVAILABLE',
        encrypt: true,
    },
    API_UNALLOWED: {
        statusCode: 403,
        logMessage: 'Unallowed request to backend',
        clientMessage: 'API_ERROR_UNALLOWED',
        encrypt: true,
    },
    API_INTERNAL: {
        statusCode: 500,
        logMessage: 'Backend internal error',
        clientMessage: 'API_ERROR_INTERNAL',
        encrypt: true,
    },
};

exports.ERRORS = ERRORS;
