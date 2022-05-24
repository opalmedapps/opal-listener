require('../test/test-setup');
const { expect } = require('chai');
const { EncryptionUtilities } = require('./encryption');

describe('EncryptionUtilities', function () {
    describe('hash()', function () {
        it('Should return hased input string', function () {
            return expect(EncryptionUtilities.hash('username')).to.be.string;
        });
    });

    describe('encryptResponse()', function () {
        it('Should return encrypted string that does not equal original data', async function () {
            const data = 'super-duper-secret-data';
            const salt = 'extra-secret-salt';
            const secret = 'just-a-secret';
            const encryptedData = await EncryptionUtilities.encryptResponse({ userID: data }, secret, salt);
            return expect(encryptedData.username).to.not.equal(data);
        });
    });

    describe('decryptRequest()', function () {
        it('Should return unencrypted string that equal original data', async function () {
            const data = 'super-duper-secret-data';
            const salt = 'extra-secret-salt';
            const secret = 'just-a-secret';
            const encryptedData = await EncryptionUtilities.encryptResponse({
                Request: 'api',
                Parameters: { userID: data },
            }, secret, salt);
            const decryptedData = await EncryptionUtilities.decryptRequest(encryptedData, secret, salt);
            return expect(decryptedData.Parameters.userID).to.equal(data);
        });
    });
});
