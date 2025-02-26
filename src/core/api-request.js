/**
 * @file relay request uploaded to firebase by the app to the Django backend.
 * @author David Gagne
 */

const axios = require('axios');
const configs = require('../config/config.json');
const legacyLogger = require('../../listener/logs/logger');

class ApiRequest {
    /**
     * @description Take the validated request uploaded to Firebase and send the Parameters field
     * which represents the axios request to the Django backend. Use legacy server to format the request
     * uploaded to Firebase.
     * @param {object} decryptedRequest Request decrypted
     * @returns {object} Formatted request that merge the response from the Django API and
     * the legacy information needed by the app.
     */
    static async makeRequest(decryptedRequest) {
        legacyLogger.log('debug', 'API: Preparing to send request to Opal API');
        const apiResponse = await ApiRequest.sendRequestToApi(decryptedRequest.UserID, decryptedRequest.Parameters);

        return {
            status_code: apiResponse.status,
            headers: apiResponse.headers,
            data: apiResponse.data,
        };
    }

    /**
     * @description Add host and auth token to request params then send it to Django backend.
     * @param {string} userId User making the request
     * @param {object} parameters Parameters from the app request.
     * @returns {object} Response from the django api
     */
    static async sendRequestToApi(userId, parameters) {
        legacyLogger.log('debug', 'API: Sending request to Opal API');
        const requestParams = parameters;
        requestParams.headers.Authorization = `Token ${configs.OPAL_BACKEND.AUTH_TOKEN}`;
        requestParams.headers.appUserId = userId;
        requestParams.url = `${configs.OPAL_BACKEND.HOST}${parameters.url}`;
        if (parameters.data !== undefined) requestParams.data = parameters.data;

        return axios(requestParams);
    }
}

module.exports = ApiRequest;
