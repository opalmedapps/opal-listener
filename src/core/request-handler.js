/**
 * @file Listen and handle request from firebase
 * @author David Gagne
 */
const JustClone = require('just-clone');
const legacyLogger = require('../../listener/logs/logger');
const legacyServer = require('../../listener/legacy-server');
const legacyProcessApi = require('../../listener/api/processApiRequest');
const legacyMainRequestApi = require('../../listener/api/main');
const legacyRequestValidator = require('../../listener/api/request/request-validator');
const ApiRequest = require('./api-request');

class RequestHandler {
    /**
     * @description Reference to the firebase database connection
     */
    #databaseRef;

    /**
     * @description Create an instance of the RequestHandler class and set connection to firebase
     * @param {object} firebaseRef - Firebase datbase reference
     */
    constructor(firebaseRef) {
        this.#databaseRef = firebaseRef;
    }

    /**
     * @description Listen to firebase request, pass it to the correct handler and upload the response to firebase.
     * @param  {object} requestType - Resquest data from Opal firebase
     */
    listenToRequests(requestType) {
        this.#databaseRef.child(requestType).off();
        this.#databaseRef.child(requestType).on('child_added', async snapshot => {
            const isSecurityRequest = Object.prototype.hasOwnProperty.call(
                legacyProcessApi.securityAPI,
                snapshot.val().Request,
            );
            try {
                const processedRequest = isSecurityRequest
                    ? await RequestHandler.processSecurityRequest(snapshot)
                    : await RequestHandler.processRequest(snapshot);
                await legacyServer.uploadToFirebase(processedRequest, requestType);
            }
            catch (error) {
                legacyLogger.log('error', 'CANNOT PROCESS REQUEST', error);
            }
        });
    }

    /**
     * @description Handle security requests
     * @param {object} snapshot - Response data snapshot from firebase
     * @returns {object} Data from the security API
     */
    static async processSecurityRequest(snapshot) {
        legacyLogger.log('debug', 'Processing security request');
        const requestKey = snapshot.key;
        const requestObject = snapshot.val();
        try {
            const response = await legacyProcessApi.securityAPI[requestObject.Request](requestKey, requestObject);
            return response;
        }
        catch (error) {
            return error;
        }
    }

    /**
     * @description Handle regular requests. If requestType is 'api', send to new pipeline else send to legacy listener
     * @param {object} snapshot - Response data snapshot from firebase
     * @returns {object} Data from the request API
     */
    static async processRequest(snapshot) {
        legacyLogger.log('debug', 'Processing regular request');
        const requestKey = snapshot.key;
        const requestObject = snapshot.val();
        // We need to clone the Obj to prevent double decryption, which cause a failure, while using the legacy code.
        const requestType = await legacyRequestValidator.validate(requestKey, JustClone(requestObject));
        try {
            const response = (requestType.type === 'api')
                ? ApiRequest.makeRequest()
                : await legacyMainRequestApi.apiRequestFormatter(requestKey, requestObject);
            return response;
        }
        catch (error) {
            return error;
        }
    }
}

exports.RequestHandler = RequestHandler;
