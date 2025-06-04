// eslint-disable-next-line max-len
// SPDX-FileCopyrightText: Copyright 2022 Opal Health Informatics Group at the Research Institute of the McGill University Health Centre <john.kildea@mcgill.ca>
//
// SPDX-License-Identifier: AGPL-3.0-or-later

/**
 * @file Gracefully handle error either coming from an api call or inside the listener.
 */
import legacyLogger from '../../listener/logs/logger.js';
import ERRORS from './const.js';

class ErrorHandler {
    /**
     * @description Format error throw by the listener to be uploaded to Firebase and handled by the App.
     * @param {object} error Error throw
     * @returns {object} Formatted error to be upload to Firebase.
     */
    static getErrorResponse(error) {
        const errorKey = error.message;
        const opalError = ERRORS[errorKey] || ERRORS.DEFAULT_ERROR;
        if (!error.cause) legacyLogger.log('error', 'An error occurred', error);
        ErrorHandler.logError(`(${opalError.statusCode}) ${errorKey}: ${opalError.logMessage}`, error.cause);
        return {
            status_code: opalError.statusCode,
            data: {
                errorMessage: opalError.clientMessage,
                errorData: error || null,
            },
            encrypt: opalError.encrypt,
        };
    }

    /**
     * @description Log error in console and log files using legacy Winston logger
     * @param {string} message Error message thrown
     * @param {object} errorObject Error data
     */
    static logError(message, errorObject) {
        legacyLogger.log('error', `API: ${message}`, errorObject);
    }
}

export default ErrorHandler;
