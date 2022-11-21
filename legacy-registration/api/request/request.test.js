const { expect } = require('chai');
const axios = require('axios');
const sinon = require('sinon');
const opalRequest = require('./request');
const ApiRequest = require('../../../src/core/api-request');

describe('opalRequest.retrievePatientDataDetailed', function () {
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
		}

	});
});
