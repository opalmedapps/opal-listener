// eslint-disable-next-line max-len
// SPDX-FileCopyrightText: Copyright 2020 Opal Health Informatics Group at the Research Institute of the McGill University Health Centre <john.kildea@mcgill.ca>
//
// SPDX-License-Identifier: AGPL-3.0-or-later

const q = require('q');
const apiRequest = require('../api/apiRequest.js');
const opalResponseSuccess = require('./response/responseSuccess.js');
const opalResponseError = require('./response/responseError.js');
const requestValidator = require('./request/requestValidator.js');
const logger = require('../logs/logger.js');


/**
 * @namespace RequestFormatter
 * @description Module is in charge of taking a request, building response
 * @type {{requestFormatter: requestFormatter, apiRequestFormatter: apiRequestFormatter}}
 */
module.exports = {
    requestFormatter,
    apiRequestFormatter
};

/**
 * requestFormatter
 * @description handles the api requests by formatting the response obtained from the API
 * @param {RequestContext} context The request context.
 * @param {key, request}
 * @returns {Promise}
 */
function requestFormatter(context, { key, request }) {
    return requestValidator.validate(context, key, request)
        .then(opalReq => {
            //opalReq of type, OpalRequest

            return apiRequest.processRequest(opalReq.toLegacy()).then((data) => {
                let response = new opalResponseSuccess(data, opalReq);

                return response.toLegacy();
            }).catch((err) => {
                logger.log('error', err);
                let response = new opalResponseError(2, 'Server error, report the error to the hospital', opalReq, JSON.stringify(err));
                return response.toLegacy();
            });
        }).catch(err => {
            logger.log('error', 'Error validating request', err);
            return err.toLegacy ? err.toLegacy() : err;
        });
}

/**
 * @name requestLegacyWrapper
 * @description Wrapper to make it compatible with current infrastructure
 * @param {RequestContext} context The request context.
 * @param requestKey
 * @param requestObject
 */
function requestLegacyWrapper(context, requestKey, requestObject) {
    let r = q.defer();

    requestFormatter(context, { key: requestKey, request: requestObject }).then((result) => {

        r.resolve(result);
    }).catch((error) => {
        logger.log('error', 'unable to request format: ' + error);
        r.reject(error);
    });
    return r.promise;
}

/**
 * apiRequestFormatter
 * @desc handles the api requests by formatting the response obtained from the API
 * @param {RequestContext} context The request context.
 * @param requestKey
 * @param requestObject
 * @returns {Promise}
 */
function apiRequestFormatter(context, requestKey, requestObject) {
    return requestLegacyWrapper(context, requestKey, requestObject);
}
