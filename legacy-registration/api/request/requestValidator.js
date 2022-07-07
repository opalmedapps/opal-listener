/**  Library Imports **/

const opalRequest = require('./request.js');
const opalResponseError = require('../response/responseError.js');
const utility = require('../utility/utility.js');
const sqlInterface = require('../sql/sqlInterface');
const logger = require('../../logs/logger.js');
const config = require('../../config-adaptor');

const q = require('q');
/**
* @class RequestValidator
* @description Obtains request, decrypts
*/
class RequestValidator {

	/**
	* validate
	* @param requestKey
	* @param requestObject
	*/
    static validate(requestKey, requestObject) {
        console.log('==>', requestObject);
        const r = q.defer();
        let request = new opalRequest(requestObject, requestKey);
        let validation = this.validateRequestCredentials(request);
        if (validation.isValid) {

            //if (!this.versionIsSecure(request)) {
            //    logger.log('error', 'Invalid version: ' + request.meta.AppVersion);
            //    r.reject(new opalResponseError(5, 'Received request from unsafe app version', request, 'Unsafe App Version'));
            //}

            //Gets user password for decrypting
            sqlInterface.getRequestEncryption(requestObject).then(function (rows) {
                logger.log('debug', 'Processing getRequestEncryption function and fetched the result: ' + rows);

                if (rows[0].length > 1 || rows[0].length === 0) {
                    //Rejects requests if username returns more than one password
                    r.reject(new opalResponseError(1, 'Potential Injection Attack, invalid password for encryption', request, 'Invalid credentials'));
                } else {

                    let RegistrationCode = rows[0][0].RegistrationCode;
                    let RAMQ = rows[0][0].RAMQ;
                    utility.decrypt({ req: request.type, params: request.parameters }, RegistrationCode, RAMQ)
                        .then((dec) => {
                            request.setAuthenticatedInfo(RAMQ, RegistrationCode, dec.req, dec.params);
                            r.resolve(request);
                        })
                        .catch((err) => {
                            logger.log('error', 'Unable to decrypt due to: ' + JSON.stringify(err));
                            r.reject(new opalResponseError(2, 'Unable to decrypt request', request, err));
                        });
                }
            }).catch((err) => {
                r.reject(new opalResponseError(2, 'Unable get user encryption', request, err));
                });

        } else {
            logger.log('error', 'invalid request due to: ' + JSON.stringify(validation.errors));
            r.reject(new opalResponseError(2, 'Unable to process request', request, 'Missing request parameters: ' + validation.errors));
        }
        return r.promise;
    }

	/***
	* @name validateRequestCredentials
	* @description Validates the credentials of a request
	* @param request
	* @returns {*}
	*/
    static validateRequestCredentials(request) {

        if (!request.meta || !request.type) { return false };
        //Must have all the properties of a request
        let prop = ['BranchName', 'Timestamp'];
        let errors = [];

        let isValid = prop.reduce((valid, property) => {
            if (!valid) return false;
            else {
                if (!request.meta.hasOwnProperty(property)) errors.push(property);
                return request.meta.hasOwnProperty(property);
            }
        }, true);

        return { isValid: isValid, errors: errors }
    }

	/**
	* Checks to see if the version of the incoming request is equal or greater than the latest stable version.
	* The idea is to block access to data if the app is not deemed safe.
	* @param request
	* @returns {boolean}
	*/
    static versionIsSecure(request) {
        let app_version = request.meta.AppVersion;
        let stable_version = config.LATEST_STABLE_VERSION;

        app_version = app_version.split('.');
        stable_version = stable_version.split('.');

        function isValidPart(x) {
            return /^\d+$/.test(x);
        }

        if (!app_version.every(isValidPart) || !stable_version.every(isValidPart)) {
            return false;
        }

        for (let i = 0; i < app_version.length; ++i) {
            if (Number(app_version[i]) > Number(stable_version[i])) {
                return true;
            }

            if (Number(app_version[i]) < Number(stable_version[i])) {
                return false
            }
        }

        return true
    }
}
module.exports = RequestValidator;
