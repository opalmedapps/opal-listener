/**
 * @file Listen and handle request uploaded to firebase by the app
 * @author David Gagne
 */
const legacyLogger = require('../../listener/logs/logger');
const { EncryptionUtilities } = require('../encryption/encryption');
const ApiRequest = require('./api-request');
const { ErrorHandler } = require('../error/handler');

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
     * @description Listen to firebase request, and upload the response to firebase.
     * @param  {object} requestType - Resquest data from Opal firebase
     */
    listenToRequests(requestType) {
        legacyLogger.log('debug', 'API: Starting request listener');
        this.#databaseRef.child(requestType).off();
        this.#databaseRef.child(requestType).on('child_added', async snapshot => this.processRequest(
            requestType,
            snapshot,
        ));
    }

    /**
     * @description Handle requests with requestType 'api'. Then upload response to Firebase
     * @param {string} requestType Firebase request unique identifier
     * @param {object} snapshot Data snapshot from firebase or and formated error to be handle by the app.
     */
    async processRequest(requestType, snapshot) {
        legacyLogger.log('debug', 'API: Processing API request');
        const encryptionInfo = {};
        try {
            if (!RequestHandler.validateSnapshot(snapshot)) throw new Error('SNAPSHOT_VALIDATION');
            encryptionInfo.userId = snapshot.val().UserID;
            encryptionInfo.salt = await EncryptionUtilities.getSalt(encryptionInfo.userId);
            encryptionInfo.secret = EncryptionUtilities.hash(encryptionInfo.userId);
            const decryptedRequest = await EncryptionUtilities.decryptRequest(
                snapshot.val(),
                encryptionInfo.secret,
                encryptionInfo.salt,
            );
            const apiResponse = await ApiRequest.makeRequest(decryptedRequest);
            const encryptedResponse = await EncryptionUtilities.encryptResponse(
                apiResponse,
                encryptionInfo.secret,
                encryptionInfo.salt,
            );
            await this.sendResponse(encryptedResponse, snapshot.key, encryptionInfo.userId);
        }
        catch (error) {
            const errorResponse = ErrorHandler.getErrorResponse(error);
            const encryptedResponse = (errorResponse.encrypt) ? await EncryptionUtilities.encryptResponse(
                errorResponse,
                encryptionInfo.secret,
                encryptionInfo.salt,
            ) : errorResponse;
            await this.sendResponse(encryptedResponse, snapshot.key, encryptionInfo.userId);
        }

        this.clearRequest(requestType, snapshot.key);
    }

    /**
     * @description High level validation of Firebase snapshot.
     * @param {object} snapshot Data snapshot uploaded from Firebase
     * @returns {boolean} Return true if the snapshot is valid.
     */
    static validateSnapshot(snapshot) {
        return (snapshot !== undefined
            && Object.keys(snapshot).length !== 0
            && Object.getPrototypeOf(snapshot) !== Object.prototype)
            && snapshot.key !== undefined;
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
     */
    async sendResponse(encryptedResponse, firebaseRequestKey, userId) {
        legacyLogger.log('debug', 'API: Sending response to Firebase');
        const path = `users/${userId}/${firebaseRequestKey}`;
        await this.#databaseRef.child(path).set(encryptedResponse);
    }
}

exports.RequestHandler = RequestHandler;
