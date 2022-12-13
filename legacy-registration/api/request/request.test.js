const { expect } = require('chai');
const sinon = require('sinon');
const opalRequest = require('./request');

describe('opalRequest', function () {
	describe('retrievePatientDataDetailed', function () {
		it('retrievePatientDataDetailed success', async function () {
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
							sex: 'M',
						}
					},
				}));

			const requestObject = {
				registrationCode: 'A0127Q0T50hk',
				language: 'fr',
			};
			const response = await opalRequest.retrievePatientDataDetailed(requestObject);

			expect(response).to.have.property('patient');
			expect(response.patient).to.have.property('ramq').equal('TESC53511613');
			expect(response).to.have.property('hospital_patients');
			expect(response.hospital_patients.length).equal(1);
			const expectedParameters = {
                method: 'get',
                url: `${process.env.OPAL_BACKEND_HOST}/api/registration/${requestObject.registrationCode}/?detailed`,
                headers: {
                    'Content-Type': 'application/json',
                    'Accept-Language': requestObject.language,
                    'Authorization': opalRequest.backendToken,
                    'Appuserid': opalRequest.appuserid,
                }
			};
			sinon.assert.calledWith(opalRequest.axiosApi, expectedParameters);
			sinon.assert.calledOnce(opalRequest.axiosApi);

			opalRequest.axiosApi.restore();
		});

		it('retrievePatientDataDetailed failed', async function () {
			sinon.stub(opalRequest, 'axiosApi').throws(new Error('Calling retrievePatientDataDetailed failed'));

			const requestObject = {
				registrationCode: 'CODE12345678',
				language: 'fr',
			};
			try {
				await opalRequest.retrievePatientDataDetailed(requestObject);
			} catch (error) {
				expect(error.message).to.equal('Calling retrievePatientDataDetailed failed');
				const expectedParameters = {
					method: 'get',
					url: `${process.env.OPAL_BACKEND_HOST}/api/registration/${requestObject.registrationCode}/?detailed`,
					headers: {
						'Content-Type': 'application/json',
						'Accept-Language': requestObject.language,
						'Authorization': opalRequest.backendToken,
						'Appuserid': opalRequest.appuserid,
					}
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
				method: 'post',
				url: `${process.env.OPAL_BACKEND_HOST}/api/registration/${request.registrationCode}/register/`,
				headers: {
					'Content-Type': 'application/json',
					'Accept-Language': request.language,
					'Authorization': opalRequest.backendToken,
					'Appuserid': opalRequest.appuserid,
				},
				data: registerData,
			};
			sinon.assert.calledWith(opalRequest.axiosApi, expectedParameters);
			sinon.assert.calledOnce(opalRequest.axiosApi);

			opalRequest.axiosApi.restore();
		});

		it('registrationRegister failed', async function () {
			sinon.stub(opalRequest, 'axiosApi').throws(new Error('Calling registrationRegister failed'));

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
				expect(error.message).to.equal('Calling registrationRegister failed');
				const expectedParameters = {
					method: 'post',
					url: `${process.env.OPAL_BACKEND_HOST}/api/registration/${request.registrationCode}/register/`,
					headers: {
						'Content-Type': 'application/json',
						'Accept-Language': request.language,
						'Authorization': opalRequest.backendToken,
						'Appuserid': opalRequest.appuserid,
					},
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
