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
     * Encryption utility classes used throughout the request handling process.
     */
    #encryptionUtils;

    /**
     * @description Create an instance of the RequestHandler class and set connection to firebase
     * @param {object} firebase - Firebase datbase reference
     */
    constructor(firebase) {
        this.#databaseRef = firebase.getDataBaseRef;
    }

    /**
     * @description Listen to firebase request, and upload the response to firebase.
     * @param  {object} requestType - Resquest data from Opal firebase
     */
    listenToRequests(requestType) {
        legacyLogger.log('debug', 'API: Starting request listener');
        this.#databaseRef.child(requestType).off();
        this.#databaseRef.child(requestType).on('child_added', async snapshot => {
            try {
                const response = await this.#processRequest(snapshot);
                await this.sendResponse(response, snapshot.key, snapshot.val().UserID);
                await this.clearRequest(requestType, snapshot.key);
            }
            catch (error) {
                legacyLogger.log('error', 'API: CANNOT PROCESS REQUEST', error);
            }
        });
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
     * @param {object} response Process unencrypted response.
     * @param {string} firebaseRequestKey Firebase request unique identifier
     * @param {string} userId User id making the request.
     */
    async sendResponse(response, firebaseRequestKey, userId) {
        legacyLogger.log('debug', 'API: Sending response to Firebase');
        const encryptedResponse = await this.#encryptionUtils.encryptResponse(response);
        const path = `users/${userId}/${firebaseRequestKey}`;
        await this.#databaseRef.child(path).set(encryptedResponse);
    }

    /**
     * @description Handle regular requests. If requestType is 'api', send to new pipeline else send to legacy listener
     * @param {object} snapshot - Response data snapshot from firebase
     * @returns {object} Data from the request API
     */
    async #processRequest(snapshot) {
        legacyLogger.log('debug', 'API: Processing API request');
        this.#encryptionUtils = new EncryptionUtilities(snapshot.val());
        const decryptedRequest = await this.#encryptionUtils.decryptRequest();
        return ApiRequest.makeRequest(decryptedRequest);
    }
}

exports.RequestHandler = RequestHandler;
