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
 * @param {key, request}
 * @returns {Promise}
 */
function requestFormatter({ key, request }) {
    return requestValidator.validate(key, request)
        .then(opalReq => {
            //opalReq of type, OpalRequest

            return apiRequest.processRequest(opalReq.toLegacy()).then((data) => {
                let response = new opalResponseSuccess(data, opalReq);

                return response.toLegacy();
            }).catch((err) => {
                let response = new opalResponseError(2, 'Server error, report the error to the hospital', opalReq, JSON.stringify(err));
                return response.toLegacy();
            });
        }).catch(err => {
            return err.toLegacy();
        });
}

/**
 * @name requestLegacyWrapper
 * @description Wrapper to make it compatible with current infrastructure
 * @param requestKey
 * @param requestObject
 */
function requestLegacyWrapper(requestKey, requestObject) {
    let r = q.defer();

    requestFormatter({ key: requestKey, request: requestObject }).then((result) => {

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
 * @param requestKey
 * @param requestObject
 * @returns {Promise}
 */


function apiRequestFormatter(requestKey, requestObject) {
    return requestLegacyWrapper(requestKey, requestObject);
}
