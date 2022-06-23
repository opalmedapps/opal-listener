/**
 * @file Gracefully handle error either coming from an api call or inside the listener.
 * @author David Gagne
 */
const legacyLogger = require('../../listener/logs/logger');

class ErrorHandler {
    /**
     * @description Create an instance of an Opal custom error with fields use for handling.
     * @param {number} statusCode HTTP status code to be return to the app and log.
     * @param {string} logMessage Dev facing message to be use in log file and console.
     * @param {object} errorObject Error data when available.
     * @param {string} clientMessage Client facing message to be return to the app and use in translations.
     * @param {boolean} encrypt Flag to trigger encrytion. Should the encryption information are not valid,
     *                       we cannot encrypt the response.
     *                       Therefore we can skip this step to ensure we retrun a generic message to the app.
     */
    constructor(statusCode, logMessage = null, errorObject = null, clientMessage = 'LOADING_ERROR', encrypt = true) {
        this.status_code = statusCode;
        this.logMessage = `API: ${logMessage}`;
        this.clientMessage = clientMessage;
        this.errorObject = errorObject;
        this.encrypt = encrypt;
    }

    static prepareErrorResponse(errorDetails) {
        ErrorHandler.LogError(errorDetails.logMessage, errorDetails.errorObject);
        return {
            status_code: errorDetails.status_code || 500,
            data: {
                errorMessage: errorDetails.clientMessage || null,
                errorObject: errorDetails.errorObject || null,
            },
        };
    }

    static LogError(message, errorObject) {
        legacyLogger.log('error', message, errorObject);
    }
}

exports.ErrorHandler = ErrorHandler;
