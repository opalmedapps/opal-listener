/**
 * @file Listen and handle request uploaded to firebase by the app
 * @author David Gagne
 */
const legacyLogger = require('../../listener/logs/logger');
const { EncryptionUtilities } = require('../encryption/encryption');
const ApiRequest = require('./api-request');
const { Firebase } = require('../firebase/firebase');

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
     * @description Handle requests with requestType 'api'. Then upload response ti Firebase
     *              Need to add timestamp after encryption to give a valid value to Firebase.
     * @param {string} requestType Firebase request unique identifier
     * @param {object} snapshot Data snapshot from firebase
     */
    async processRequest(requestType, snapshot) {
        legacyLogger.log('debug', 'API: Processing API request');
        try {
            if (!RequestHandler.validateSnapshot(snapshot)) throw new Error('API: Firebase snapshot invalid');
            const userId = snapshot.val().UserID;
            const salt = await EncryptionUtilities.getSalt(userId);
            const secret = EncryptionUtilities.hash(userId);
            const decryptedRequest = await EncryptionUtilities.decryptRequest(snapshot.val(), secret, salt);
            const apiResponse = await ApiRequest.makeRequest(decryptedRequest);
            const encryptedResponse = await EncryptionUtilities.encryptResponse(apiResponse, secret, salt);
            encryptedResponse.timestamp = Firebase.getDatabaseTimeStamp;
            await this.sendResponse(encryptedResponse, snapshot.key, userId);
            this.clearRequest(requestType, snapshot.key);
        }
        catch (error) {
            legacyLogger.log('error', 'API: CANNOT PROCESS REQUEST', error);
            this.clearRequest(requestType, snapshot.key);
        }
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
