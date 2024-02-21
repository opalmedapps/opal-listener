const { expect } = require('chai');
const sinon = require('sinon');
const opalRequest = require('./request');

describe('opalRequest', function () {
	describe('retrieveRegistrationDataDetailed', function () {
		it('retrieveRegistrationDataDetailed success', async function () {
			sinon.stub(opalRequest, 'axiosApi')
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
							sex: 'Male',
						}
					},
				}));
			const registrationCode = 'A0127Q0T50hk';
			const response = await opalRequest.retrieveRegistrationDataDetailed(registrationCode);

			expect(response).to.have.property('patient');
			expect(response.patient).to.have.property('ramq').equal('TESC53511613');
			expect(response).to.have.property('hospital_patients');
			expect(response.hospital_patients.length).equal(1);
			let headers = opalRequest.backendApiHeaders;
			const expectedParameters = {
				method: 'get',
				url: `${process.env.BACKEND_HOST}/api/registration/${registrationCode}/?detailed`,
				headers: headers,
			};
			sinon.assert.calledWith(opalRequest.axiosApi, expectedParameters);
			sinon.assert.calledOnce(opalRequest.axiosApi);

			opalRequest.axiosApi.restore();
		});

		it('retrieveRegistrationDataDetailed failed', async function () {
			sinon.stub(opalRequest, 'axiosApi').throws(new Error('Calling retrieveRegistrationDataDetailed failed'));
			const registrationCode = 'CODE12345678';
			try {
				await opalRequest.retrieveRegistrationDataDetailed(registrationCode);
			} catch (error) {
				expect(error.message).to.equal('Calling retrieveRegistrationDataDetailed failed');
				let headers = opalRequest.backendApiHeaders;
				const expectedParameters = {
					method: 'get',
					url: `${process.env.BACKEND_HOST}/api/registration/${registrationCode}/?detailed`,
					headers: headers,
				};
				sinon.assert.calledWith(opalRequest.axiosApi, expectedParameters);
				sinon.assert.calledOnce(opalRequest.axiosApi);
			}

			opalRequest.axiosApi.restore();
		});
	});

	describe('registrationRegister', function () {
		it('registrationRegister success', async function () {
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

			const response = await opalRequest.registrationRegister(registrationCode, registerData);
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

		it('registrationRegister failed', async function () {
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
				await opalRequest.registrationRegister(registrationCode, registerData);
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
		it('getLabResultHistory success', async function () {
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

	describe('caregiverIsAlreadyRegistered', function () {
		it('caregiverIsAlreadyRegistered success', async function () {
			sinon.stub(opalRequest, 'axiosApi')
				.returns(Promise.resolve({
				}));
			const username = 'ThQKckoll2Y3tXcA1k7iCfGhmeu1';
			const response = await opalRequest.caregiverIsAlreadyRegistered(username);
			expect(response).to.have.property('status').equal('200');

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

		it('caregiverIsAlreadyRegistered failed', async function () {
			sinon.stub(opalRequest, 'axiosApi').throws(new Error('Calling caregiverIsAlreadyRegistered failed'));
			const username = '3vWyFmdHL2PbXyYiYnUf7wj50Jm1';
			try {
				await opalRequest.caregiverIsAlreadyRegistered(username);
			} catch (error) {
				expect(error.message).to.equal('Calling caregiverIsAlreadyRegistered failed');
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
