require('dotenv').config();
const { expect } = require('chai');
const axios = require('axios');
const sinon = require('sinon');
const opalRequest = require('./request');

describe('opalRequest.retrievePatientDataDetailed', function () {
	before(() => {
		sinon.stub(axios, 'get')
			.yields(null, null, JSON.stringify({
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
		axios.get.restore();
	});

	it('retrievePatientDataDetailed success', async function () {
		const requestObject = {
			Parameters: {
				Fields: {},
			},
		};
		const mockData = JSON.parse(process.env.MOCK_DATA);
		requestObject.Parameters.Fields.registrationCode = mockData.registrationCode;
		requestObject.Parameters.Fields.language = 'en';
		const response = await opalRequest.retrievePatientDataDetailed(requestObject);

		expect(response).to.have.property('patient');
		expect(response.patient).to.have.property('ramq').equal('TESC53511613');
		expect(response).to.have.property('hospital_patients');
		expect(response.hospital_patients.length).equal(1);
	});

	it('retrievePatientDataDetailed invalid registration code', async function () {
		const requestObject = {
			Parameters: {
				Fields: {},
			},
		};
		requestObject.Parameters.Fields.registrationCode = null;
		requestObject.Parameters.Fields.language = 'en';
		try {
			await opalRequest.retrievePatientDataDetailed(requestObject);
		} catch (error) {
			expect(error.message).equal('API_NOT_FOUND');
			expect(error.cause).to.have.property('detail').equal('Not found.');
		}
	});
});
