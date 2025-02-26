/**
 *
 *
 */
require('dotenv').config();
const axios = require('axios');
const logger = require('../../../listener/logs/logger');

const env = {
	BACKEND_HOST: process.env.BACKEND_HOST,
	BACKEND_REGISTRATION_AUTH_TOKEN: process.env.BACKEND_REGISTRATION_AUTH_TOKEN,
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
		'Authorization': `Token ${env.BACKEND_REGISTRATION_AUTH_TOKEN}`,
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
			logger.log('error', 'axios error details', error?.data);
			throw error.message;
		}

	}

    // new backend apis

	/**
	 retrieveRegistrationDataDetailed
	 @desc call the new backend api 'registration/<std:code>/?detailed.
	 @param {string} registrationCode The user's registration code.
	 @param {string} language The user's selected language.
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
	static async retrieveRegistrationDataDetailed(registrationCode) {
		let headers = this.backendApiHeaders;
		const url = `${env.BACKEND_HOST}/api/registration/${registrationCode}/?detailed`;
		const requestParams = {
			method: 'get',
			url: url,
			headers: headers,
		};
		logger.log('info', 'Calling API to get registration details', url);
		const response = await this.axiosApi(requestParams);
		if (!response || !response.data) {
			logger.log('error', 'API response has no data', response);
			throw new Error("API response didn't return any registration data");
		}
		return response.data;
	}

	/**
	 registrationRegister
	 @desc call the new backend api 'registration/<std:code>/register/.
	 @param {string} registrationCode The user's registration code.
	 @param {string} language The user's selected language.
	 @param {object} registerData The registration data formatted for the API.
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
	static async registrationRegister(registrationCode, language, registerData) {
		let headers = this.backendApiHeaders;
		headers['Accept-Language'] = language;
		const url = `${env.BACKEND_HOST}/api/registration/${registrationCode}/register/`;
		const requestParams = {
			method: 'post',
			url: url,
			headers: headers,
			data: registerData,
		};
		logger.log('info', 'Calling API to register patient in the backend', url)
		const response = await this.axiosApi(requestParams);
		return response.data;
	}

	// get lab result history api

	/**
	 * @description insert patient hospital indetifier with request parameters.
	 * @param {string} labResultHistoryURL - The URL to call to request the patient's lab result history.
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
