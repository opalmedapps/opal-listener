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
			const language = 'fr';
			const response = await opalRequest.retrieveRegistrationDataDetailed(registrationCode, language);

			expect(response).to.have.property('patient');
			expect(response.patient).to.have.property('ramq').equal('TESC53511613');
			expect(response).to.have.property('hospital_patients');
			expect(response.hospital_patients.length).equal(1);
			let headers = opalRequest.backendApiHeaders;
			headers['Accept-Language'] = language;
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
			const language = 'fr';
			try {
				await opalRequest.retrieveRegistrationDataDetailed(registrationCode, language);
			} catch (error) {
				expect(error.message).to.equal('Calling retrieveRegistrationDataDetailed failed');
				let headers = opalRequest.backendApiHeaders;
				headers['Accept-Language'] = language;
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
			const language = 'en';
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

			const response = await opalRequest.registrationRegister(registrationCode, language, registerData);
			expect(response).to.empty;

			let headers = opalRequest.backendApiHeaders;
			headers['Accept-Language'] = language;

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
			const language = 'en';
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
				await opalRequest.registrationRegister(registrationCode, language, registerData);
			} catch (error) {
				expect(error.message).to.equal('Calling registrationRegister failed');

				let headers = opalRequest.backendApiHeaders;
				headers['Accept-Language'] = language;

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
});
