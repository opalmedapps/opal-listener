// SPDX-FileCopyrightText: Copyright 2015 Opal Health Informatics Group at the Research Institute of the McGill University Health Centre <john.kildea@mcgill.ca>
//
// SPDX-License-Identifier: AGPL-3.0-or-later

import q from 'q';
import processApiRequest from './processApiRequest.js';
import OpalResponseSuccess from './response/response-success.js';
import OpalResponseError from './response/response-error.js';
import RequestValidator from './request/request-validator.js';
import logger from '../logs/logger.js';
import ValidationError from './errors/validation-error.js';

/**
 * requestFormatter
 * @description handles the api requests by formatting the response obtained from the API
 * @param {RequestContext} context The request context.
 * @param {key, request}
 * @returns {Promise}
 */
function requestFormatter(context, {key,request}) {

	logger.log('debug', `request object in request formatter: ${JSON.stringify(request)}`);
	return RequestValidator.validate(context, key, request)
		.then( opalReq => { //opalReq of type, OpalRequest

			// After they have been decrypted, log all main requests in the table PatientActivityLog. -SB
			processApiRequest.logPatientRequest(opalReq);

			return processApiRequest.processRequest(opalReq).then((data)=>
			{
				logger.log('debug', 'Successfully processed request: ', data);
				logger.log('verbose', 'Successfully processed request');
				return (new OpalResponseSuccess(data, opalReq)).toLegacy();
			}).catch((err)=>{
				logger.log('error', 'Error processing request', err);
				if(err instanceof ValidationError){
					return (new OpalResponseError(400, err.error, opalReq, err.cause)).toLegacy();
				}else{
					return (new OpalResponseError(
						2,
						'Server error, report the error to the hospital',
						opalReq,
						err.cause,
					)).toLegacy();
				}
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
	requestFormatter(context, {key: requestKey,request:requestObject})
		.then((result)=>r.resolve(result)).catch((result)=>r.resolve(result));
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
function apiRequestFormatter(context, requestKey,requestObject) {
	return  requestLegacyWrapper(context, requestKey, requestObject);
}

export default {
    apiRequestFormatter
}
