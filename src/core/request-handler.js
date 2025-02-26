/**
 * @file Listen and handle request from firebase
 * @author David Gagne
 */
const legacyLogger = require('../../listener/logs/logger');
const { EncryptionUtilities } = require('../utility/encryption');
const ApiRequest = require('./api-request');

class RequestHandler {
    /**
     * @description Reference to the firebase database connection
     */
    #databaseRef;

    /**
     * @description Key to identify Firebase requests.
     */
    #firebaseRequestKey;

    /**
     * Encryption utility classes used throughout the request handling process.
     */
    #encryptionUtils;

    /**
     * User ID from the user who made the request.
     */
    #userId;

    /**
     * @description Create an instance of the RequestHandler class and set connection to firebase
     * @param {object} firebase - Firebase datbase reference
     */
    constructor(firebase) {
        this.#databaseRef = firebase.getDataBaseRef;
    }

    /**
     * @description Listen to firebase request, pass it to the correct handler and upload the response to firebase.
     * @param  {object} requestType - Resquest data from Opal firebase
     */
    listenToRequests(requestType) {
        legacyLogger.log('debug', 'API: Strting request listener');
        this.#databaseRef.child(requestType).off();
        this.#databaseRef.child(requestType).on('child_added', async snapshot => {
            try {
                const response = await this.#processRequest(snapshot);
                await this.sendResponse(response);
                await this.clearRequest(requestType);
            }
            catch (error) {
                legacyLogger.log('error', 'API: CANNOT PROCESS REQUEST', error);
            }
        });
    }

    /**
     * @description Remove request from Firebase once it is process.
     * @param {string} requestType Type of request sent to Firebase.
     */
    async clearRequest(requestType) {
        legacyLogger.log('debug', 'API: Clearing request from Firebase');
        await this.#databaseRef.child(requestType).child(this.#firebaseRequestKey).set(null);
    }

    /**
     * @description Send response to Firebase after being processed.
     * @param {object} response Process unencrypted response.
     */
    async sendResponse(response) {
        legacyLogger.log('debug', 'API: Sending response to Firebase');
        const encryptedResponse = await this.#encryptionUtils.encryptResponse(response);
        const path = `users/${this.#userId}/${this.#firebaseRequestKey}`;
        await this.#databaseRef.child(path).set(encryptedResponse);
    }

    /**
     * @description Handle regular requests. If requestType is 'api', send to new pipeline else send to legacy listener
     * @param {object} snapshot - Response data snapshot from firebase
     * @returns {object} Data from the request API
     */
    async #processRequest(snapshot) {
        legacyLogger.log('debug', 'API: Processing API request');
        this.#firebaseRequestKey = snapshot.key;
        this.#encryptionUtils = new EncryptionUtilities(snapshot.val());
        const decryptedRequest = await this.#encryptionUtils.decryptRequest();
        this.#userId = decryptedRequest.UserID;
        return ApiRequest.makeRequest(decryptedRequest);
    }
}

exports.RequestHandler = RequestHandler;
