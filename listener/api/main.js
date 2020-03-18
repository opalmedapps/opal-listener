const q                   = require('q');
const processApiRequest   = require('./processApiRequest.js');
const OpalResponseSuccess = require('./response/response-success');
const {OpalResponseError}   = require('./response/response-error');
const OpalResponse   = require('./response/response');
const RequestValidator    = require('./request/request-validator');
const logger              = require('../logs/logger.js');
const {ValidationError} = require("./errors/validation-error");

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
function requestFormatter({key,request}) {

	logger.log('debug', 'request object in request formatter: ' + JSON.stringify(request));
	return RequestValidator.validate(key, request)
		.then( opalReq => { //opalReq of type, OpalRequest

            // After they have been decrypted, log all main requests in the table PatientActivityLog. -SB
            processApiRequest.logPatientRequest(opalReq);
			return processApiRequest.processRequest(opalReq).then((data)=>
			{
				logger.log('debug', 'Successfully processed request: ' + data);
                logger.log('info', 'Successfully processed request');
				return (new OpalResponseSuccess(data, opalReq)).toLegacy();
			}).catch((err)=>{
				logger.log('error', 'Error processing request', err);
				if(err instanceof ValidationError){
					return (new OpalResponseError( 400, err.error, opalReq)).toLegacy();
				}else{
					return (new OpalResponseError( 2, 'Server error, report the error to the hospital',
						opalReq, JSON.stringify(err))).toLegacy();
				}
			});
		}).catch( err => {
            logger.log('error', 'Error validating request', err);
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
	requestFormatter({key: requestKey,request:requestObject})
		.then((result)=>r.resolve(result)).catch((result)=>r.resolve(result));
	return r.promise;
}

/**
 * apiRequestFormatter
 * @desc handles the api requests by formatting the response obtained from the API
 * @param requestKey
 * @param requestObject
 * @returns {Promise}
 */
function apiRequestFormatter(requestKey,requestObject) {
	return  requestLegacyWrapper(requestKey, requestObject);
}


