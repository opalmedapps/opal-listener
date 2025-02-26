/**
 * @file relay request uploaded to firebase by the app to the Django backend.
 * @author David Gagne
 */

const Axios = require('axios');
const LegacyLogger = require('../../listener/logs/logger');
const LegacyOpalResponseSuccess = require('../../listener/api/response/response-success');

class ApiRequest {
    /**
     * @description Take the validated request uploaded to Firebase and send the Parameters field which
     *              represent the axios request to the Djabgo backend.
     * @param {object} validatedRequest Request decrypted and validated by the listener.
     * @returns {object} Request data from Django backend.
     */
    static async makeRequest(validatedRequest) {
        LegacyLogger.log('debug', 'Sending request to Opal API');
        const apiResponse = await Axios(validatedRequest.parameters);
        const opalResponse = new LegacyOpalResponseSuccess({
            Response: 'success',
            Data: apiResponse.data.results,
        });
        return new LegacyOpalResponseSuccess(opalResponse, validatedRequest).toLegacy();
    }
}

module.exports = ApiRequest;
