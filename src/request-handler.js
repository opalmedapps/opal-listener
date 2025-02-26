/**
 * @file Listen and handle request from firebase
 * @author David Gagne, Donald Duck
 */
const logger = require('../listener/logs/logger');
const legacyServer = require('../listener/legacy-server');
const legacyProcessApi = require('../listener/api/processApiRequest');
const legacyMainRequestApi = require('../listener/api/main.js');

class RequestHandler {
    /**
     * @description Reference to the firebase database connection
     */
    #databaseRef;
    /**
     * @description Create an instance of the RequestHandler class and set connection to firebase
     * @param  {Class} firebase - Firebase manager class
     */
    constructor(firebase) {
        this.#setFirebaseConnection(firebase);
    }
    /**
     * Create the firebase database reference.
     * @param  {Class} firebase - Firebase manager class
     */
    #setFirebaseConnection(firebase) {
        this.#databaseRef = firebase.database.ref(firebase.root);
        this.#databaseRef.set(null).catch(function (error) {
            logger.log('error', 'Cannot reset firebase', error);
        });
    }
    /**
     * Getter for the database reference to pass to legacy-server to keep it working for now
     */
    get databaseRef() {
        return this.#databaseRef;
    }
    /**
     * @description Listen to firebase request, pass it to the correct handler and upload the response to firebase.
     * @param  {Object} requestType - Resquest data from Opal firebase
     */
    listenToRequest(requestType) {
        this.#databaseRef.child(requestType).off();
        this.#databaseRef.child(requestType).on('child_added', async (snapshot) => {
            const isSecurityRequest = legacyProcessApi.securityAPI.hasOwnProperty(snapshot.val().Request);
            try {
                const processedRequest = isSecurityRequest ? await this.processSecurityRequests(snapshot) : await this.processRequests(snapshot);
                await legacyServer.uploadToFirebase(processedRequest, requestType);
            } catch (error) {
                logger.log('error', 'CANNOT PROCESS REQUEST', error);
            }
        });
    }
    /**
     * @description Handle security requests
     * @param {Object} snapshot - Response data snapshit from firebase
     * @returns Data from the security API
     */
    processSecurityRequests(snapshot) {
        return new Promise(async (resolve, reject) => {
            const requestKey = snapshot.key;
            const requestObject = snapshot.val();
            try {
                const response = await legacyProcessApi.securityAPI[requestObject.Request](requestKey, requestObject);
                resolve(response);
            } catch (error) {
                reject(error);
            }
        });
    }
    /**
     * @description Handle regular requests
     * @param {Object} snapshot - Response data snapshit from firebase
     * @returns Data from the request API
     */
    processRequests(snapshot) {
        return new Promise(async (resolve, reject) => {
            const requestKey = snapshot.key;
            const requestObject = snapshot.val();
            try {
                const response = await legacyMainRequestApi.apiRequestFormatter(requestKey, requestObject);
                resolve(response);
            } catch (error) {
                reject(error);
            }
        });
    }
}

exports.RequestHandler = RequestHandler;
