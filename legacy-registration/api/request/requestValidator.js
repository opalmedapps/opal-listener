const legacyUtility = require('../../../listener/utility/utility.js');
const logger = require('../../logs/logger.js');
const opalRequest = require('./request.js');
const opalResponseError = require('../response/responseError.js');
const Registration = require('../../../src/registration/registration');

/**
* @class RequestValidator
* @description Obtains request, decrypts
*/
class RequestValidator {

    /**
     * @description Validates and decrypts a registration request.
     * @param {RequestContext} context The request context.
     * @param requestKey
     * @param requestObject
     * @returns {Promise<Object>}
     */
    static async validate(context, requestKey, requestObject) {
        let request = new opalRequest(requestObject, requestKey);
        let validation = this.validateRequestCredentials(request);
        if (!validation.isValid) {
            logger.log('error', 'Invalid legacy registration request', validation.errors);
            throw new opalResponseError(2, 'Unable to process request', request, 'Missing request parameters: ' + validation.errors);
        }

        let encryptionInfo;
        try {
            encryptionInfo = await Registration.getEncryptionValues(context);
            logger.log('debug', 'Got encryption info for decryption');
        }
        catch(error) {
            logger.log('error', 'Unable to get valid user encryption info from the API', err);
            throw new opalResponseError(2, 'Unable to get valid user encryption info from the API', request, err);
        }

        try {
            let objectToDecrypt = { Request: request.type, Parameters: request.parameters, BranchName: requestObject.BranchName };

            let decryptedRequest = Array.isArray(encryptionInfo.salt)
                ? await Registration.decryptManySalts(context, objectToDecrypt, encryptionInfo)
                : await legacyUtility.decrypt(context, objectToDecrypt, encryptionInfo.secret, encryptionInfo.salt);
            decryptedRequest.setAuthenticatedInfo(encryptionInfo.salt, encryptionInfo.secret, decryptedRequest.Request, decryptedRequest.Parameters);
            return decryptedRequest;
        }
        catch(error) {
            logger.log('error', 'Unable to decrypt legacy registration request', error);
            throw new opalResponseError(2, 'Unable to decrypt request', request, error);
        }
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
