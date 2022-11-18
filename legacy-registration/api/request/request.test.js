const { expect } = require('chai');
const axios = require('axios');
const sinon = require('sinon');
const opalRequest = require('./request');
const ApiRequest = require('../../../src/core/api-request');

describe('opalRequest', function () {
	describe('retrievePatientDataDetailed', function () {
		before(() => {
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
		});

		after(() => {
			ApiRequest.makeRequest.restore();
		});

		it('retrievePatientDataDetailed success', async function () {
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
		});
	});

	describe('registrationRegister', function () {
		before(() => {
			sinon.stub(ApiRequest, 'makeRequest')
				.returns(Promise.resolve({
					data: {},
				}));
		});

		after(() => {
			ApiRequest.makeRequest.restore();
		});

		it('registrationRegister success', async function () {
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

		});
	});
});
