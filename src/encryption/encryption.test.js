// SPDX-FileCopyrightText: Copyright 2022 Opal Health Informatics Group at the Research Institute of the McGill University Health Centre <john.kildea@mcgill.ca>
//
// SPDX-License-Identifier: AGPL-3.0-or-later

import '../test/chai-setup.js';
import crypto from 'crypto';
import EncryptionUtilities from './encryption.js';
import { expect } from 'chai';
import legacyUtility from '../../listener/utility/utility.js';
import OpalSQLQueryRunner from '../../listener/sql/opal-sql-query-runner.js';
import RequestContext from '../core/request-context.js';
import sinon from 'sinon';

const context = new RequestContext('test', {
    UserID: 'test-id',
});

let encryptStub;
let queryStub;

describe('EncryptionUtilities', function () {
    describe('encryptResponse', function () {
        it('should return an encrypted string different from the original data', async function () {
            const data = 'super-duper-secret-data';
            const salt = 'extra-secret-salt';
            const secret = 'just-a-secret';
            const encryptedData = await EncryptionUtilities.encryptResponse(context, { userID: data }, secret, salt);
            return expect(encryptedData.username).to.not.equal(data);
        });
        it('should wrap unexpected errors as generic encryption errors', async function () {
            encryptStub = sinon.stub(legacyUtility, 'encrypt');
            encryptStub.throws();
            let promise = EncryptionUtilities.encryptResponse(context, 'test', 'secret', 'salt');
            return expect(promise).to.be.rejectedWith('ENCRYPTION');
        });
        after(function () {
            if (encryptStub) encryptStub.restore();
        });
    });

    describe('decryptRequest', function () {
        it('should return an unencrypted string equal to the original data', async function () {
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

    describe('hash', function () {
        it('should return hashed input as a string', function () {
            return expect(EncryptionUtilities.hash('username')).to.be.string;
        });
    });

    describe('getEncryptionInfo', function () {
        let queryData = [{
            SecurityAnswer: 'test',
        }];

        before(function () {
            queryStub = sinon.stub(OpalSQLQueryRunner, 'run');
            queryStub.returns(queryData);
        });
        it("should return the user's hashed user ID as the secret value", async function () {
            let hashedId = crypto.createHash('sha512').update(context.userId).digest('hex');
            let result = await EncryptionUtilities.getEncryptionInfo(context);
            expect(result.secret).to.equal(hashedId);
        });
        it('should return a security answer as the salt value', async function () {
            let result = await EncryptionUtilities.getEncryptionInfo(context);
            expect(result.salt).to.equal(queryData[0].SecurityAnswer);
        });
        it('should throw an ENCRYPTION_SALT error if the database query fails', function () {
            queryStub.throws();
            let promise = EncryptionUtilities.getEncryptionInfo(context);
            return expect(promise).to.be.rejectedWith('ENCRYPTION_SALT');
        });
        after(function () {
            if (queryStub) queryStub.restore();
        });
    });
});
