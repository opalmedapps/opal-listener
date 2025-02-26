/**
 *
 * 
 */
const q = require('q');
const ApiRequest = require('../../../src/core/api-request');

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

    // new backend apis

	/**
	 retrievePatientDataDetailed
	 @desc call the new backend api 'registration/<std:code>/?detailed.
	 @param requestObject
	 @return {Promise}
	 @response data: {
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
	static async retrievePatientDataDetailed(requestObject) {
		const Parameters = requestObject?.Parameters?.Fields;
		const language = Parameters?.language ? Parameters.language : 'en';
		const requestParams = {
			Parameters: {
				method: 'get',
				url: `/api/registration/${Parameters?.registrationCode}/?detailed`,
				headers: {
					'Content-Type': 'application/json',
					'Accept-Language': language,
				},
			},
		};
		return await ApiRequest.makeRequest(requestParams);
	}

	/**
	 registrationRegister
	 @desc call the new backend api 'registration/<std:code>/register/.
	 @param request, registerData
	 request = {
	 	ramq: str,
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
		const language = request?.language ? request.language : 'fr';
		const requestParams = {
			Parameters: {
				method: 'post',
				url: `/api/registration/${request?.ramq}/register/`,
				headers: {
					'Content-Type': 'application/json',
					'Accept-Language': language,
				},
				data: registerData,
			},
		};
		return await ApiRequest.makeRequest(requestParams);
	}
}

module.exports = opalRequest;