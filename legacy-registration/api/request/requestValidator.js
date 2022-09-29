/**  Library Imports **/

const opalRequest = require('./request.js');
const opalResponseError = require('../response/responseError.js');
const logger = require('../../logs/logger.js');
const Registration = require('../../../src/registration/registration');

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
        const r = q.defer();
        let request = new opalRequest(requestObject, requestKey);
        let validation = this.validateRequestCredentials(request);
        if (validation.isValid) {
            //Gets user password for decrypting
            Registration.getEncryptionValues(requestObject).then(function (encryptionInfo) {
                logger.log('debug', 'Got encryption info for decryption');
                let objectToDecrypt = { req: request.type, params: request.parameters };
                Registration.decryptOneOrManySalts(objectToDecrypt, encryptionInfo).then((decryptedRequest) => {
                    request.setAuthenticatedInfo(encryptionInfo.salt, encryptionInfo.secret, decryptedRequest.req, decryptedRequest.params);
                    r.resolve(request);
                })
                .catch((err) => {
                    logger.log('error', 'Unable to decrypt legacy registration request', err);
                    r.reject(new opalResponseError(2, 'Unable to decrypt request', request, err));
                });
            }).catch((err) => {
                r.reject(new opalResponseError(2, 'Unable get user encryption', request, err));
            });
        } else {
            logger.log('error', 'Invalid legacy registration request', validation.errors);
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
}
module.exports = RequestValidator;
