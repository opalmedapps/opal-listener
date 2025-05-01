// eslint-disable-next-line max-len
// SPDX-FileCopyrightText: Copyright 2022 Opal Health Informatics Group at the Research Institute of the McGill University Health Centre <john.kildea@mcgill.ca>
//
// SPDX-License-Identifier: AGPL-3.0-or-later

/**
 * @file Listen and handle request uploaded to firebase by the app
 */
const ApiRequest = require('./api-request');
const Encryption = require('../encryption/encryption');
const ErrorHandler = require('../error/handler');
const { Firebase } = require('../firebase/firebase');
const keyDerivationCache = require('../utility/key-derivation-cache');
const legacyLogger = require('../../listener/logs/logger');
const Registration = require('../registration/registration');
const { REQUEST_TYPE, REGISTER_SEARCH_REQUEST_REGEX } = require('../const');
const { RequestContext } = require('./request-context');

class RequestHandler {
    /**
     * @description Reference to the firebase database connection
     */
    #databaseRef;

    /**
     * @description Create an instance of the RequestHandler class and set connection to firebase
     * @param {object} firebase - Firebase database reference
     */
    constructor(firebase) {
        this.#databaseRef = firebase.getDataBaseRef;
    }

    /**
     * @description Listens for firebase requests, and uploads the responses to firebase.
     * @param {string} requestType The Firebase branch on which to listen, representing a type of request.
     */
    listenForRequests(requestType) {
        legacyLogger.log('info', `API: Starting request listener on ${requestType}`);
        this.#databaseRef.child(requestType).off();
        this.#databaseRef.child(requestType).on('child_added', snapshot => this.processRequest(requestType, snapshot));
    }

    /**
     * @description Handle requests with requestType 'api'. Then upload response ti Firebase
     *              Need to add timestamp after encryption to give a valid value to Firebase.
     * @param {string} requestType Firebase request unique identifier
     * @param {object} snapshot Data snapshot from firebase or and formatted error to be handle by the app.
     */
    async processRequest(requestType, snapshot) {
        legacyLogger.log('debug', `API: Processing API request of type ${requestType}`);
        let encryptionInfo;
        let context;

        try {
            // Validate request
            RequestHandler.validateSnapshot(snapshot);
            const requestObject = snapshot.val();
            context = new RequestContext(requestType, requestObject);

            // Decrypt request
            encryptionInfo = requestType === REQUEST_TYPE.REGISTRATION
                ? await Registration.getEncryptionValues(context)
                : await Encryption.getEncryptionInfo(context);
            const decryptedRequest = Array.isArray(encryptionInfo.salt)
                ? await Registration.decryptManySalts(context, requestObject, encryptionInfo)
                : await Encryption.decryptRequest(context, requestObject, encryptionInfo.secret, encryptionInfo.salt);

            // Special case: on a first registration request, invalidate cached encryption info
            if (REGISTER_SEARCH_REQUEST_REGEX.test(requestObject.Parameters?.url)) {
                await keyDerivationCache.invalidate(context.cacheLabel);
            }

            // Process the request
            const apiResponse = await ApiRequest.makeRequest(decryptedRequest);

            // Encrypt and upload response
            const encryptedResponse = await Encryption.encryptResponse(
                context,
                apiResponse,
                encryptionInfo.secret,
                encryptionInfo.salt,
            );
            encryptedResponse.timestamp = Firebase.getDatabaseTimeStamp;
            await this.sendResponse(encryptedResponse, snapshot.key, context.userId, requestType);
            this.clearRequest(requestType, snapshot.key);
        }
        catch (error) {
            legacyLogger.log('error', `Error processing request of type ${requestType}`, error);
            const errorResponse = ErrorHandler.getErrorResponse(error);
            let finalResponse;
            if (RequestHandler.errorResponseCanBeEncrypted(errorResponse, encryptionInfo)) {
                finalResponse = await Encryption.encryptResponse(
                    context,
                    errorResponse,
                    encryptionInfo.secret,
                    encryptionInfo.salt,
                );
            }
            else {
                finalResponse = errorResponse;
                // Make sure that encrypt is false if we didn't encrypt, to give the right info to the frontend
                finalResponse.encrypt = false;
            }
            await this.sendResponse(finalResponse, snapshot.key, encryptionInfo?.userId, requestType);
        }

        this.clearRequest(requestType, snapshot.key);
    }

    /**
     * @description Determines if an error response can be encrypted with the available information at hand.
     * @param {object} errorResponse An error response from ErrorHandler.getErrorResponse.
     * @param {object} encryptionInfo An object containing an encryption secret and salt.
     * @returns {boolean} True if the error object can and should be encrypted; false otherwise.
     */
    static errorResponseCanBeEncrypted(errorResponse, encryptionInfo) {
        return errorResponse.encrypt // An error should be encrypted only if indicated in the error object
            && encryptionInfo?.secret
            && encryptionInfo?.salt
            && !Array.isArray(encryptionInfo.salt); // Can't encrypt if an array of possible salts failed to resolve
    }

    /**
     * @description High level validation of Firebase snapshot.
     * @param {object} snapshot Data snapshot uploaded from Firebase
     * @throws {Error} Throws a SNAPSHOT_VALIDATION error if the snapshot is invalid.
     */
    static validateSnapshot(snapshot) {
        const valid = snapshot !== undefined
            && Object.keys(snapshot).length !== 0
            && Object.getPrototypeOf(snapshot) !== Object.prototype
            && snapshot.key !== undefined;
        if (!valid) throw new Error('SNAPSHOT_VALIDATION');
    }

    /**
     * @description Remove request from Firebase once it is processed.
     * @param {string} requestType Type of request sent to Firebase.
     * @param {string} firebaseRequestKey Firebase request unique identifier
     */
    async clearRequest(requestType, firebaseRequestKey) {
        legacyLogger.log('debug', 'API: Clearing request from Firebase');
        await this.#databaseRef.child(requestType).child(firebaseRequestKey).set(null);
    }

    /**
     * @description Send response to Firebase after being processed.
     * @param {object} encryptedResponse Processed and encrypted response.
     * @param {string} firebaseRequestKey Firebase request unique identifier
     * @param {string} userId User id making the request.
     * @param {string} requestType Type of request between 'api or 'registration'.
     */
    async sendResponse(encryptedResponse, firebaseRequestKey, userId, requestType) {
        legacyLogger.log('debug', 'API: Sending response to Firebase');
        const path = (requestType === REQUEST_TYPE.REGISTRATION)
            ? `registration-api/responses/${firebaseRequestKey}`
            : `users/${userId}/${firebaseRequestKey}`;
        await this.#databaseRef.child(path).set(encryptedResponse);
    }
}

exports.RequestHandler = RequestHandler;
