/**
 *
 * 
 */
require('dotenv').config();
const axios = require('axios');
const logger = require('../../../listener/logs/logger');

const env = {
	OPAL_BACKEND_HOST: process.env.OPAL_BACKEND_HOST,
	OPAL_BACKEND_AUTH_TOKEN: process.env.OPAL_BACKEND_AUTH_TOKEN,
};

class opalRequest {
    
	constructor(reqObj, key, salt='', pass=''){
		this.type = reqObj.Request;
		this.parameters = reqObj.Parameters;
		this.key = key;
		this.auth = {salt: salt,pass: pass};
		this.meta = reqObj; //contains deviceId, token, UserEmail etc..
		delete reqObj.Request;
		delete reqObj.Parameters;
	}

	setAuthenticatedInfo(salt, pass, type, params)
	{
		this.auth.salt = salt;
        this.auth.pass = pass;
		this.type = type;
        this.params = params;
    }

	toLegacy(){
		this.meta.Request = this.type;
		this.meta.Parameters = this.parameters;
		return this.meta;
    }

    //==========================Rest Apis=======================================
	static backendApiHeaders = {
		'Authorization': `Token ${env.OPAL_BACKEND_AUTH_TOKEN}`,
		'Content-Type': 'application/json',
		'Appuserid': 'registration',
	}

	/**
	 axiosApi
	 @desc basic or raw api for the other apis.
	 @param request: {
	 	method: str,
	 	url: str,
	 	headers: object,
	 	data: object,
	 }
	 @return the response of axios
	 @response {
	 	status: int,
	 	headers: object,
	 	data: object,
	 }
	 **/
	static async axiosApi(request) {
		try {
			return await axios(request);
		} catch (error) {
			logger.log('error', 'axiosApi call failed', error);
			throw error.message;
		}

	}

    // new backend apis

	/**
	 retrievePatientDataDetailed
	 @desc call the new backend api 'registration/<std:code>/?detailed.
	 @param requestObject
	 @return {Promise}
	 @response {
	 	hospital_patients: [
	 		{
				mrn: int,
				site_code: str,
			},
	 	],
	 	patient: {
	 		date_of_birth: date,
	 		first_name: str,
	 		last_name: str,
	 		ramq: str,
	 		sex: str,
	 	}
	 }
	 **/
	static async retrievePatientDataDetailed(request) {
		let headers = this.backendApiHeaders;
		headers['Accept-Language'] = request.language;
		const url = `${env.OPAL_BACKEND_HOST}/api/registration/${request?.registrationCode}/?detailed`;
		const requestParams = {
			method: 'get',
			url: url,
			headers: headers,
		};
		const response = await this.axiosApi(requestParams);
		return response.data;
	}

	/**
	 registrationRegister
	 @desc call the new backend api 'registration/<std:code>/register/.
	 @param request, registerData
	 request = {
	 	registrationCode: str,
	 	language: str,
	 }
	 registerData = {
	 	patient: {
	 		legacy_id: int
	 	},
	 	caregiver: {
	 		language: str,
	 		phone_number: str,
	 	},
	 	security_answers: [
	 		{
				question: str,
				answer: str,
			},
	 	],
	 }
	 @return {Promise}
	 **/
	static async registrationRegister(request, registerData) {
		let headers = this.backendApiHeaders;
		headers['Accept-Language'] = request.language;
		const url = `${env.OPAL_BACKEND_HOST}/api/registration/${request?.registrationCode}/register/`;
		const requestParams = {
			method: 'post',
			url: url,
			headers: headers,
			data: registerData,
		};
		const response = await this.axiosApi(requestParams);
		return response.data;
	}

	// get lab result history api

	/**
	 * @description insert patient hospital indetifier with request parameters.
	 * @param {str} labResultHistoryURL - The URL of the lab result history.
	 * @param {object} data: {
	 *     PatientId: str,
     *     Site: str,
	 * }
	 * @returns {
     *     status: number,
     *     headers: object,
     *     data: object,
     * }
	 */
	static async getLabResultHistory(labResultHistoryURL, data) {
		const requestParams = {
			method: 'post',
			url: labResultHistoryURL,
			headers: {'Content-Type': 'application/json'},
			data: {
				json: true,
				body: data,
			},
		}
		const response = await this.axiosApi(requestParams);
		return response.data;
	}
}

module.exports = opalRequest;