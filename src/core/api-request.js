// eslint-disable-next-line max-len
// SPDX-FileCopyrightText: Copyright 2022 Opal Health Informatics Group at the Research Institute of the McGill University Health Centre <john.kildea@mcgill.ca>
//
// SPDX-License-Identifier: AGPL-3.0-or-later

/**
 * @file relay request uploaded to firebase by the app to the Django backend.
 */
const axios = require('axios');
const { convert } = require('html-to-text');
const legacyLogger = require('../../listener/logs/logger');

const configs = {
    BACKEND_HOST: process.env.BACKEND_HOST,
    BACKEND_LISTENER_AUTH_TOKEN: process.env.BACKEND_LISTENER_AUTH_TOKEN,
    BACKEND_REGISTRATION_AUTH_TOKEN: process.env.BACKEND_REGISTRATION_AUTH_TOKEN,
};
class ApiRequest {
    /**
     * @description Take the validated request uploaded to Firebase and send the Parameters field
     * which represents the axios request to the Django backend. Use legacy server to format the request
     * uploaded to Firebase.
     * @param {object} requestParams decrypted request containing a Parameters field with the request parameters
     *                 and an optional UserID field.
     *                 For requests coming from the app, the UserID of the authenticated user needs to be provided.
     * @returns {object} Formatted request that merge the response from the Django API and
     * the legacy information needed by the app.
     */
    static async makeRequest(requestParams) {
        legacyLogger.log('debug', 'API: Preparing to send request to Opal API', requestParams?.Parameters?.url);
        const userId = requestParams.UserID || 'registration';
        const apiResponse = await ApiRequest.sendRequestToApi(userId, requestParams.Parameters);
        return {
            status_code: apiResponse.status,
            headers: apiResponse.headers,
            data: apiResponse.data,
        };
    }

    /**
     * @description Add host and auth token to request params then send it to Django backend.
     * @param {string} userId Firebase user id making the request
     * @param {object} parameters Parameters from the app request.
     * @returns {object} Response from the django api
     */
    static async sendRequestToApi(userId, parameters) {
        legacyLogger.log('debug', 'API: Sending request to Opal API');
        const requestParams = parameters;

        const token = userId === 'registration'
            ? configs.BACKEND_REGISTRATION_AUTH_TOKEN
            : configs.BACKEND_LISTENER_AUTH_TOKEN;
        requestParams.headers.Authorization = `Token ${token}`;
        requestParams.headers.Appuserid = userId;
        requestParams.url = `${configs.BACKEND_HOST}${parameters.url}`;

        if (parameters.data !== undefined) requestParams.data = parameters.data;

        if (parameters.params !== undefined) requestParams.params = parameters.params;

        try {
            return await axios(requestParams);
        }
        catch (error) {
            return ApiRequest.handleApiError(error);
        }
    }

    /**
     * @description Assign correct client facing message return to the app,
     *              filter out HTML error details that are not optimal for logging,
     *              prefix log message,
     *              throw custom opal error
     * @param {object} error Error details from Axios failure.
     */
    static handleApiError(error) {
        const errorCode = !error.response ? error.code : error.response.status;
        const errorData = !error.response ? null : ApiRequest.filterOutHTML(error.response.data);
        let opalError;
        switch (errorCode) {
        case 404:
            opalError = 'API_NOT_FOUND';
            break;
        case 403:
            opalError = 'API_UNALLOWED';
            break;
        case 'ECONNREFUSED':
            opalError = 'API_NOT_AVAILABLE';
            break;
        default:
            opalError = 'DEFAULT_ERROR';
            break;
        }

        throw new Error(opalError, { cause: errorData || errorCode });
    }

    /**
     * @description Filter out HTML from Django's error page. Only the text from the id="summary" HTML div is returned.
     * @param {object} errorData Error data from axios failure.
     * @returns {string|object} The extracted summary text from the original HTML, or the input object itself
     *                          if it isn't HTML.
     */
    static filterOutHTML(errorData) {
        return (typeof errorData === 'string' && errorData.indexOf('<!DOCTYPE') !== -1)
            ? convert(errorData, {
                baseElements: {
                    selectors: ['#summary'], // For brevity, only extract info from the summary tag (in Django response)
                    orderBy: 'occurrence',
                    returnDomByDefault: false,
                },
            }).split('\n').join(' ')
            : errorData;
    }
}

module.exports = ApiRequest;
