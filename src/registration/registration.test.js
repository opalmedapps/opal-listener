require('../test/test-setup');
const { expect } = require('chai');
const Registration = require('./registration');
const EncryptionUtilities = require('../encryption/encryption');
const DefaultRequestData = require('../test/simulate-request/mock-request');
const legacyUtility = require('../../listener/utility/utility');

describe('Registration', function () {
    describe('getEncryptionValues()', function() {
        it('Should return non null salt and secret of length 12', async function () {
            const encryptedBranchName = EncryptionUtilities.hash(DefaultRequestData.registrationRequest.BranchName);
            const encryptedData = await legacyUtility.encrypt(
                {
                    request: DefaultRequestData.registrationRequest.Request,
                    params: DefaultRequestData.registrationRequest.Parameters,
                },
                DefaultRequestData.registrationRequest.BranchName,
                DefaultRequestData.registrationRequest.Parameters.data.ramq,
            );
            const requestData = {
                Request: encryptedData.request,
                BranchName: encryptedBranchName,
                Parameters: encryptedData.params,
            };
            const response = await Registration.getEncryptionValues(requestData);
            expect(response).to.have.keys('salt', 'secret');
            expect(response.salt).to.have.lengthOf(12); // TODO: Must be changed when MRN fetching adding
            expect(response.secret).to.have.lengthOf(12);
        });
    });
});
