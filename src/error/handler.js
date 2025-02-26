/**
 * @file Gracefully handle error either coming from an api call or inside the listener.
 * @author David Gagne
 */
const legacyLogger = require('../../listener/logs/logger');
const { ERRORS } = require('./const');

class ErrorHandler {
    /**
     * @description Format error throw by the listener to be uploaded to Firebase and handled by the App.
     * @param {object} error Error throw
     * @returns {object} Formated error to be upload to Firebase.
     */
    static getErrorResponse(error) {
        const opalError = ERRORS[error.message] || ERRORS.DEFAULT_ERROR;
        ErrorHandler.LogError(opalError.logMessage, error.cause);
        return {
            status_code: opalError.statusCode,
            data: {
                errorMessage: opalError.clientMessage,
                errorData: error || null,
            },
        };
    }

    /**
     * @description Log error in console and log files using legacy Winston logger
     * @param {string} message Error message thown
     * @param {object} errorObject Error data
     */
    static LogError(message, errorObject) {
        legacyLogger.log('error', `API: ${message}`, errorObject);
    }
}

exports.ErrorHandler = ErrorHandler;
