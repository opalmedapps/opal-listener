/**
 * @file relay request uploaded to firebase by the app to the Django backend.
 * @author David Gagne
 */

const Axios = require('axios');
const Configs = require('../config/config.json');
const LegacyLogger = require('../../listener/logs/logger');
const LegacyOpalResponseSuccess = require('../../listener/api/response/response-success');

class ApiRequest {
    /**
     * @description Take the validated request uploaded to Firebase and send the Parameters field
     * which represents the axios request to the Django backend. Use legacy server to format the request
     * uploaded to Firebase.
     * @param {object} validatedRequest Request decrypted and validated by the listener.
     * @returns {object} Formatted request that merge the response from the Django API and
     * the legacy information needed by the app.
     */
    static async makeRequest(validatedRequest) {
        LegacyLogger.log('debug', 'Preparing to send request to Opal API');
        const apiResponse = await ApiRequest.sendRequestToApi(validatedRequest.parameters);
        const opalResponse = new LegacyOpalResponseSuccess({
            Response: 'success',
            Data: apiResponse.data.results,
        });
        return new LegacyOpalResponseSuccess(opalResponse, validatedRequest).toLegacy();
    }

    /**
     * @description Add host and auth token to request params then send it to Django backend.
     * @param {object} parameters - Parameters from the app request.
     * @returns {object} Response from the django api
     */
    static async sendRequestToApi(parameters) {
        LegacyLogger.log('debug', 'Sending request to Opal API');
        const requestParams = parameters;
        requestParams.headers.Authorization = Configs.OPAL_BACKEND.AUTH_TOKEN;
        requestParams.url = `${Configs.OPAL_BACKEND.HOST}${parameters.url}`;
        return Axios(requestParams);
    }
}

module.exports = ApiRequest;
