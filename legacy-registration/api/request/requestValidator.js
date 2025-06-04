// SPDX-FileCopyrightText: Copyright 2020 Opal Health Informatics Group at the Research Institute of the McGill University Health Centre <john.kildea@mcgill.ca>
//
// SPDX-License-Identifier: AGPL-3.0-or-later

import legacyUtility from '../../../listener/utility/utility.js';
import logger from '../../logs/logger.js';
import opalRequest from './request.js';
import opalResponseError from '../response/responseError.js';
import Registration from '../../../src/registration/registration.js';

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
            logger.log('error', 'Unable to get valid user encryption info from the API', error);
            throw new opalResponseError(2, 'Unable to get valid user encryption info from the API', request, error);
        }

        try {
            let infoToDecrypt = { Request: request.type, Parameters: request.parameters };
            let decryptedInfo = Array.isArray(encryptionInfo.salt)
                ? await Registration.decryptManySalts(context, infoToDecrypt, encryptionInfo)
                : await legacyUtility.decrypt(context, infoToDecrypt, encryptionInfo.secret, encryptionInfo.salt);
            request.setAuthenticatedInfo(encryptionInfo.salt, encryptionInfo.secret, decryptedInfo.Request, decryptedInfo.Parameters);
            return request;
        }
        catch(error) {
            logger.log('error', 'Unable to decrypt legacy registration request', error);
            throw new opalResponseError(1, 'Unable to decrypt request', request, error);
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

export default RequestValidator;
