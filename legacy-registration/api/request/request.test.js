const { expect } = require('chai');
const axios = require('axios');
const sinon = require('sinon');
const opalRequest = require('./request');
const ApiRequest = require('../../../src/core/api-request');


describe('opalRequest', function () {
	describe('retrievePatientDataDetailed', function () {
		it('retrievePatientDataDetailed success', async function () {
			sinon.stub(ApiRequest, 'makeRequest')
				.returns(Promise.resolve({
					data: {
						hospital_patients: [
							{
								mrn: '9999993',
								site_code: 'aaa',
							},
						],
						patient: {
							date_of_birth: '1985-01-01',
							first_name: 'Kevin',
							last_name: 'Chen',
							ramq: 'TESC53511613',
							sex: 'M',
						}
					},
				}));

			const requestObject = {
				Parameters: {
					Fields: {},
				},
			};
			requestObject.Parameters.Fields.registrationCode = 'A0127Q0T50hk';
			requestObject.Parameters.Fields.language = 'en';
			const response = await opalRequest.retrievePatientDataDetailed(requestObject);

			expect(response).to.have.property('patient');
			expect(response.patient).to.have.property('ramq').equal('TESC53511613');
			expect(response).to.have.property('hospital_patients');
			expect(response.hospital_patients.length).equal(1);
			const expectedParameters = {
				Parameters: {
					method: 'get',
					url: `/api/registration/${requestObject.Parameters.Fields.registrationCode}/?detailed`,
					headers: {
						'Content-Type': 'application/json',
						'Accept-Language': requestObject.Parameters.Fields.language,
					}
				}
			};
			sinon.assert.calledWith(ApiRequest.makeRequest, expectedParameters);
			sinon.assert.calledOnce(ApiRequest.makeRequest);

			ApiRequest.makeRequest.restore();
		});

		it('retrievePatientDataDetailed failed', async function () {
			sinon.stub(ApiRequest, 'makeRequest').throws(new Error('API_NOT_FOUND'));

			const requestObject = {
				Parameters: {
					Fields: {},
				},
			};
			requestObject.Parameters.Fields.registrationCode = 'CODE12345678';
			requestObject.Parameters.Fields.language = 'en';
			try {
				await opalRequest.retrievePatientDataDetailed(requestObject);
			} catch (error) {
				expect(error.message).to.equal('API_NOT_FOUND');
				const expectedParameters = {
					Parameters: {
						method: 'get',
						url: `/api/registration/${requestObject.Parameters.Fields.registrationCode}/?detailed`,
						headers: {
							'Content-Type': 'application/json',
							'Accept-Language': requestObject.Parameters.Fields.language,
						}
					}
				};
				sinon.assert.calledWith(ApiRequest.makeRequest, expectedParameters);
				sinon.assert.calledOnce(ApiRequest.makeRequest);
			}

			ApiRequest.makeRequest.restore();
		});
	});

	describe('registrationRegister', function () {
		it('registrationRegister success', async function () {
			sinon.stub(ApiRequest, 'makeRequest')
				.returns(Promise.resolve({
					data: {},
				}));

			const request = {
				registrationCode: 'A0127Q0T50hk',
				language: 'en',
			}
			const registerData = {
				patient: {
					legacy_id: '1'
				},
				caregiver: {
					language: 'en',
					phone_number: '+15142223333',
				},
				security_answers: [
					{
						question: 'pet',
						answer: 'bird',
					},
				],
			}

			const response = await opalRequest.registrationRegister(request, registerData);
			expect(response).to.empty;

			const expectedParameters = {
				Parameters: {
					method: 'post',
					url: `/api/registration/${request.registrationCode}/register/`,
					headers: {
						'Content-Type': 'application/json',
						'Accept-Language': request.language,
					},
					data: registerData,
				}
			};
			sinon.assert.calledWith(ApiRequest.makeRequest, expectedParameters);
			sinon.assert.calledOnce(ApiRequest.makeRequest);

			ApiRequest.makeRequest.restore();
		});

		it('registrationRegister failed', async function () {
			sinon.stub(ApiRequest, 'makeRequest').throws(new Error('API_NOT_FOUND'));

			const request = {
				registrationCode: 'A0127Q0T50hk',
				language: 'en',
			}
			const registerData = {
				patient: {
					legacy_id: '1'
				},
				caregiver: {
					language: 'en',
					phone_number: '+15142223333',
				},
				security_answers: [
					{
						question: 'pet',
						answer: 'bird',
					},
				],
			}

			try {
				await await opalRequest.registrationRegister(request, registerData);
			} catch (error) {
				expect(error.message).to.equal('API_NOT_FOUND');
				const expectedParameters = {
					Parameters: {
						method: 'post',
						url: `/api/registration/${request.registrationCode}/register/`,
						headers: {
							'Content-Type': 'application/json',
							'Accept-Language': request.language,
						},
						data: registerData,
					}
				};
				sinon.assert.calledWith(ApiRequest.makeRequest, expectedParameters);
				sinon.assert.calledOnce(ApiRequest.makeRequest);
			}

			ApiRequest.makeRequest.restore();
		});
	});
});
