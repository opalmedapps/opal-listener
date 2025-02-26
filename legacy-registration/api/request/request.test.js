// SPDX-FileCopyrightText: Copyright 2022 Opal Health Informatics Group at the Research Institute of the McGill University Health Centre <john.kildea@mcgill.ca>
//
// SPDX-License-Identifier: AGPL-3.0-or-later

const { expect } = require('chai');
const sinon = require('sinon');
const opalRequest = require('./request');

describe('opalRequest', function () {
	describe('registrationRegister', function () {
		it('should registrationRegister function success', async function () {
			sinon.stub(opalRequest, 'axiosApi')
				.returns(Promise.resolve({
					data: {},
				}));

			const registrationCode = 'A0127Q0T50hk';
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

			const response = await opalRequest.registrationRegister(registrationCode, registerData, false);
			expect(response).to.empty;

			let headers = opalRequest.backendApiHeaders;

			const expectedParameters = {
				method: 'post',
				url: `${process.env.BACKEND_HOST}/api/registration/${registrationCode}/register/`,
				headers: headers,
				data: registerData,
			};
			sinon.assert.calledWith(opalRequest.axiosApi, expectedParameters);
			sinon.assert.calledOnce(opalRequest.axiosApi);

			opalRequest.axiosApi.restore();
		});

		it('should registrationRegister function failed', async function () {
			sinon.stub(opalRequest, 'axiosApi').throws(new Error('Calling registrationRegister failed'));

			const registrationCode = 'A0127Q0T50hk';
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
				await opalRequest.registrationRegister(registrationCode, registerData, false);
			} catch (error) {
				expect(error.message).to.equal('Calling registrationRegister failed');

				let headers = opalRequest.backendApiHeaders;

				const expectedParameters = {
					method: 'post',
					url: `${process.env.BACKEND_HOST}/api/registration/${registrationCode}/register/`,
					headers: headers,
					data: registerData,
				};
				sinon.assert.calledWith(opalRequest.axiosApi, expectedParameters);
				sinon.assert.calledOnce(opalRequest.axiosApi);
			}

			opalRequest.axiosApi.restore();
		});
	});

	describe('getLabResultHistory', function () {
		it('should getLabResultHistory function success', async function () {
			sinon.stub(opalRequest, 'axiosApi')
				.returns(Promise.resolve({
					data: {},
				}));

			const labResultHistoryURL = 'https://test_url.com'
			const requestData = {
				PatientId: '1',
				Site: '1',
			}

			const response = await opalRequest.getLabResultHistory(labResultHistoryURL, requestData);
			expect(response).to.empty;

			const requestParams = {
				method: 'post',
				url: labResultHistoryURL,
				headers: {'Content-Type': 'application/json'},
				data: {
					json: true,
					body: requestData,
				},
			}
			sinon.assert.calledWith(opalRequest.axiosApi, requestParams);
			sinon.assert.calledOnce(opalRequest.axiosApi);

			opalRequest.axiosApi.restore();
		});
	});

	describe('isCaregiverAlreadyRegistered', function () {
		it('should isCaregiverAlreadyRegistered function success', async function () {
			sinon.stub(opalRequest, 'axiosApi')
				.returns(Promise.resolve({
				}));
			const username = 'ThQKckoll2Y3tXcA1k7iCfGhmeu1';
			const response = await opalRequest.isCaregiverAlreadyRegistered(username);
			expect(response).to.be.empty;

			let headers = opalRequest.backendApiHeaders;
			const expectedParameters = {
				method: 'get',
				url: `${process.env.BACKEND_HOST}/api/caregivers/${username}/`,
				headers: headers,
			};
			sinon.assert.calledWith(opalRequest.axiosApi, expectedParameters);
			sinon.assert.calledOnce(opalRequest.axiosApi);

			opalRequest.axiosApi.restore();
		});

		it('should isCaregiverAlreadyRegistered function failed', async function () {
			sinon.stub(opalRequest, 'axiosApi').throws(new Error('Calling isCaregiverAlreadyRegistered failed'));
			const username = '3vWyFmdHL2PbXyYiYnUf7wj50Jm1';
			try {
				await opalRequest.isCaregiverAlreadyRegistered(username);
			} catch (error) {
				expect(error.message).to.equal('Calling isCaregiverAlreadyRegistered failed');
				let headers = opalRequest.backendApiHeaders;
				const expectedParameters = {
					method: 'get',
					url: `${process.env.BACKEND_HOST}/api/caregivers/${username}/`,
					headers: headers,
				};
				sinon.assert.calledWith(opalRequest.axiosApi, expectedParameters);
				sinon.assert.calledOnce(opalRequest.axiosApi);
			}

			opalRequest.axiosApi.restore();
		});
	});
});
