// eslint-disable-next-line max-len
// SPDX-FileCopyrightText: Copyright 2022 Opal Health Informatics Group at the Research Institute of the McGill University Health Centre <john.kildea@mcgill.ca>
//
// SPDX-License-Identifier: AGPL-3.0-or-later

require('../test/chai-setup');
const { expect } = require('chai');
const EncryptionUtilities = require('./encryption');
const { RequestContext } = require('../core/request-context');

const context = new RequestContext('test', {});

describe('EncryptionUtilities', function () {
    describe('hash()', function () {
        it('Should return hashed input as a string', function () {
            return expect(EncryptionUtilities.hash('username')).to.be.string;
        });
    });

    describe('encryptResponse()', function () {
        it('Should return an encrypted string different from the original data', async function () {
            const data = 'super-duper-secret-data';
            const salt = 'extra-secret-salt';
            const secret = 'just-a-secret';
            const encryptedData = await EncryptionUtilities.encryptResponse(context, { userID: data }, secret, salt);
            return expect(encryptedData.username).to.not.equal(data);
        });
    });

    describe('decryptRequest()', function () {
        it('Should return an unencrypted string equal to the original data', async function () {
            const data = 'super-duper-secret-data';
            const salt = 'extra-secret-salt';
            const secret = 'just-a-secret';
            const encryptedData = await EncryptionUtilities.encryptResponse(context, {
                Request: 'api',
                Parameters: { userID: data },
            }, secret, salt);
            const decryptedData = await EncryptionUtilities.decryptRequest(context, encryptedData, secret, salt);
            return expect(decryptedData.Parameters.userID).to.equal(data);
        });
    });
});
