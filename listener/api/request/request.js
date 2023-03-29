/**
 *
 */
require('dotenv').config();
const axios = require('axios');
const logger = require('../../logs/logger');

const env = {
	OPAL_BACKEND_HOST: process.env.OPAL_BACKEND_HOST,
	OPAL_BACKEND_AUTH_TOKEN: process.env.OPAL_BACKEND_AUTH_TOKEN,
};


class OpalRequest {
	constructor(reqObj, key, salt='', pass=''){
		this.type = reqObj.Request;
		this.parameters = reqObj.Parameters;
		this.key = key;
		this.auth = {salt: salt,pass: pass};
		this.meta = new RequestMeta(reqObj); //contains deviceId, token, UserEmail etc..
		delete reqObj.Request;
		delete reqObj.Parameters;
	}

	setAuthenticatedInfo(salt, hashedUID, type, params)
	{
		this.auth.salt = salt;
		this.auth.hashedUID = hashedUID;
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

	/**
	 retrieveCaregiverProfile
	 @desc call the new backend api 'caregiver/<str:username>/profile/.
	 @param request
	 @return {Promise}
	 @response {
	 	username: string
	 	uuid: string
	 }
	 **/
	static async retrieveCaregiverProfile(request) {
		let headers = this.backendApiHeaders;
		headers['Accept-Language'] = request.language;
		const username = request.username;
		const url = `${env.OPAL_BACKEND_HOST}/api/caregiver/${username}/profile/`;
		const requestParams = {
			method: 'get',
			url: url,
			headers: headers,
		};
		const response = await this.axiosApi(requestParams);
		return response.data;
	}

	/**
	 getRandomSecurityAnswer
	 @desc call the new backend api 'caregivers/<uuid:uuid>/security-questions/random/.
	 @param request
	 @return {Promise}
	 @response {
	 	id: int,
	 	question: string,
	 	answer: string,
	 }
	 **/
	static async getRandomSecurityAnswer(request) {
		let headers = this.backendApiHeaders;
		headers['Accept-Language'] = request.language;
		const uuid = request.uuid;
		const url = `${env.OPAL_BACKEND_HOST}/api/caregivers/${uuid}/security-questions/random/`;
		const requestParams = {
			method: 'get',
			url: url,
			headers: headers,
		};
		const response = await this.axiosApi(requestParams);
		return response.data;
	}
}

module.exports = OpalRequest;

class RequestMeta {
	constructor({DeviceId, Token, UserID, TargetPatientID, Timestamp, UserEmail, AppVersion}) {
		this.DeviceId = DeviceId;
		this.Token = Token;
		this.UserID = UserID;
		this.TargetPatientID = TargetPatientID;
		this.Timestamp = Timestamp;
		this.UserEmail = UserEmail;
		this.AppVersion = AppVersion;
	}
}
