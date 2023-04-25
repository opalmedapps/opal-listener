/**
*  Opal Imports
*/
const OpalRequest = require('./request');
const {OpalResponseError} = require('../response/response-error');
const sqlInterface = require('../sqlInterface');
const utility = require('../../utility/utility');
const { Version } = require('../../../src/utility/version');
const logger = require('../../logs/logger');
const config = require('../../config-adaptor');
const ApiRequest = require('../../../src/core/api-request.js');

/**
* Library imports
*/
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
	static validate(requestKey, requestObject)
	{
		const r = q.defer();
		let request = new OpalRequest(requestObject, requestKey);

		let validation = this.validateRequestCredentials(request);

		if(validation.isValid) {

			if (!this.versionIsSecure(request)) {
				logger.log('error', `Invalid version: ${request.meta.AppVersion}`);
				r.reject(new OpalResponseError(5, 'Received request from unsafe app version', request, 'Unsafe App Version'));
			}

			// Get hashed UID for decrypting
			let hashedUID = utility.hash(requestObject.UserID);

			// Get user security answer for decrypting
			sqlInterface.getEncryption(requestObject).then(function(rows) {
				if (rows.length > 1 || rows.length === 0) {
					// Reject requests if username returns more than one row
					r.reject(new OpalResponseError(1, 'Potential Injection Attack', request, 'Invalid credentials'));
				} else {

					let {AnswerText} = rows[0];
					utility.decrypt({req: request.type, params: request.parameters}, hashedUID, AnswerText)
					.then((dec)=>{
						request.setAuthenticatedInfo(AnswerText, hashedUID, dec.req, dec.params);
						return RequestValidator.validateRequestPermissions(request);
					}).then(() => {
						r.resolve(request);
					}).catch((err)=>{
						const errMessage = 'Unable to decrypt or validate'
						logger.log('error', errMessage, err);
						r.reject(new OpalResponseError(1, errMessage, request, err));
					});
				}
			}).catch((err)=>{
				r.reject(new OpalResponseError(1, 'Unable get user encryption', request, err));
			});
		}else{
			logger.log('error', `invalid request due to: ${JSON.stringify(validation.errors)}`);
			r.reject(new OpalResponseError(2, 'Unable to process request', request, 'Missing request parameters: ' + validation.errors));
		}
		return r.promise;
	}

	/***
	* @name validateRequestCredentials
	* @description Validates the credentials of a request
	* @param request
	* @returns {*}
	*/
	static validateRequestCredentials(request){
		if(!request.meta || !request.type) return false;
		//Must have all the properties of a request
		let prop = ['DeviceId', 'Token', 'UserID','Timestamp','UserEmail', 'AppVersion'];
		let errors = [];

		let isValid = prop.reduce((valid, property)=>{
			if(!valid) return false;
			else {
				if(!request.meta.hasOwnProperty(property)) errors.push(property);
				return request.meta.hasOwnProperty(property);
			}
		},true);

		return {isValid: isValid, errors: errors}
	}

	/**
	 * @desc Validates whether the user has permission to request data for a given patient.
	 *       This function only performs a permissions check if the request has a TargetPatientID (meaning that it
	 *       targets patient data); otherwise, this function resolves and the request can proceed.
	 *       If the request has a TargetPatientID, two checks are performed: first, a legacy check for 'self'
	 *       in the OpalDB, and second (if no match was found in OpalDB), an API check via the Django backend.
	 *       NOTE!!! Calling the 'UserPatient' endpoint is a special case, where TargetPatientID gets assigned
	 *       in this function. This needed to check SELF relationship permissions during login.
	 * @param {Object} request The request to validate.
	 * @param {string} request.meta.UserID The ID of the user making the request.
	 * @param {number} [request.meta.TargetPatientID] The ID of the patient whose data is being requested, if this is
	 *                                                a patient-data request.
	 * @returns {Promise<void>} Resolves if the permissions are granted or if the request is not patient-targeted.
	 *                          Otherwise (if permissions fail), rejects with an error.
	 */
	static async validateRequestPermissions(request) {
        // Add TargetPatientID to the request if the calling endpoint (a.k.a., RequestType) is the 'UserPatient'
        // This will enforce permissions check via the new backend (Django)
        if (request.type === 'UserPatient') {
            try {
                let patientSerNum = await sqlInterface.getSelfPatientSerNum(request.meta.UserID);
                request.meta.TargetPatientID = patientSerNum;
            }
            catch (error) {
                throw new Error(
                    `Error during permissions validation for caregiver with Username = '${request.meta.UserID}': ${error} calling 'UserPatient' endpoint.`
                );
            }
        }

        const logDetails = `caregiver with Username = '${request.meta.UserID}' requesting data from PatientSerNum = ${request.meta.TargetPatientID}`;

		// Only perform validation on requests with a TargetPatientID
		if (!request.meta.TargetPatientID) {
			logger.log('verbose', "No permission validation necessary because this isn't a patient-targeted request");
			return;
		}

		// Check user's permissions by calling Django's API endpoint (e.g., /check-permissions/)
		logger.log('info', `Checking permissions for ${logDetails}, via API request to the backend`);
		let apiResponse;
		try {
			apiResponse = await ApiRequest.sendRequestToApi(request.meta.UserID, {
				url: `/api/patients/legacy/${request.meta.TargetPatientID}/check-permissions/`,
				headers: {},
			});
			logger.log('info', `Permissions response received with status = ${apiResponse.status} for ${logDetails}`, apiResponse.data);
			if (apiResponse.status !== 200) throw apiResponse;
			else logger.log('info', `Permission granted: response code 200, for ${logDetails}`);
		}
		catch(axiosError) {
			logger.log('error', 'Error during permissions validation', axiosError);
			logger.log('error', 'Error details', axiosError.cause);
			if (axiosError?.cause?.detail) throw new Error(`Permissions validation failed for ${logDetails}; reason: ${axiosError.cause.detail}`)
			else throw new Error(`Error during permissions validation for ${logDetails}: ${axiosError}`);
		}
	}

	/**
	* Checks to see if the version of the incoming request is equal or greater than the latest stable version.
	* The idea is to block access to data if the app is not deemed safe.
	* @param request
	* @returns {boolean}
	*/
	static versionIsSecure(request){
		try {
			let app_version = request.meta.AppVersion;
			let stable_version = config.LATEST_STABLE_VERSION;
			return Version.versionGreaterOrEqual(app_version, stable_version);
		}
		catch (error) {
			logger.log('error', 'Error while checking the version number of the request', error);
			return false;
		}
	}
}
module.exports = RequestValidator;
