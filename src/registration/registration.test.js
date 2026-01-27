// SPDX-FileCopyrightText: Copyright 2022 Opal Health Informatics Group at the Research Institute of the McGill University Health Centre <john.kildea@mcgill.ca>
//
// SPDX-License-Identifier: AGPL-3.0-or-later

/**
 * @file Unit tests for the Registration class.
 */

import '../test/chai-setup.js';
import { assert, spy, stub } from 'sinon';
import { clone } from '../test/test-utilities.js';
import ApiRequest from '../core/api-request.js';
import EncryptionUtilities from '../encryption/encryption.js';
import { expect } from 'chai';
import logger from '../../listener/logs/logger.js';
import Registration from './registration.js';
import RequestContext from '../core/request-context.js';

const context = new RequestContext('test', {});
let loggerSpy;
let apiRequestStub;
const originalObj = {
    Request: 'test',
    Parameters: {
        id: '1',
    },
};
const secret = 'secret';

describe('Registration', function () {
    before(function () {
        loggerSpy = spy(logger, 'log');
        apiRequestStub = stub(ApiRequest, 'makeRequest');
        apiRequestStub.returns({
            data: {
                code: 'A0AAAAAAAAAA',
                status: 'NEW',
                patient: {
                    ramq: 'AAAA11111111',
                },
                hospital_patients: [
                    {
                        mrn: '9999999',
                        is_active: true,
                    },
                ],
            },
        });
    });

    describe('events', function () {
        it('should log any error that occurs in the cache during execution', function () {
            Registration.regCache.emit('error', 'test');
            assert.calledWith(loggerSpy, 'error', 'KeyV registration data cache error', 'test');
        });
    });

    describe('getEncryptionValues', function () {
        it('should call the API on cache miss', async function () {
            apiRequestStub.resetHistory();
            let context = new RequestContext('Test', {});
            await Registration.getEncryptionValues(context);
            assert.calledOnce(apiRequestStub);
        });
        it('should not call the API on cache hit', async function () {
            apiRequestStub.resetHistory();
            let context = new RequestContext('Test', {
                BranchName: 'unit-test',
            });
            await Registration.regCache.set('salt-unit-test', 'test');
            await Registration.regCache.set('secret-unit-test', 'test');
            await Registration.getEncryptionValues(context);
            assert.notCalled(apiRequestStub);
        });
    });

    describe('secretAndSaltFromResponse', function () {
        it('should throw an ENCRYPTION_SALT error when no salt is found', async function () {
            const response = {
                data: {
                    code: 'code1234',
                    patient: { },
                    hospital_patients: [],
                },
            };
            expect(() => Registration.secretAndSaltFromResponse(response)).to.throw(Error, 'ENCRYPTION_SALT');
        });
        it('should throw an ENCRYPTION_SECRET error when no secret is found', async function () {
            const response = {
                data: {
                    patient: { ramq: 'OTES12345678' },
                },
            };
            expect(() => Registration.secretAndSaltFromResponse(response)).to.throw(Error, 'ENCRYPTION_SECRET');
        });
        it('should throw an ENCRYPTION_SALT error given no response', async function () {
            expect(() => Registration.secretAndSaltFromResponse(undefined)).to.throw(Error, 'ENCRYPTION_SALT');
        });
        it('should throw an ENCRYPTION_SALT error given a response with no data', async function () {
            const response = {
                other: 'something',
            };
            expect(() => Registration.secretAndSaltFromResponse(response)).to.throw(Error, 'ENCRYPTION_SALT');
        });
        it('should throw an ENCRYPTION_SALT error given a response with no hospital_patients', async function () {
            const response = {
                data: {
                    code: 'code1234',
                    patient: { },
                },
            };
            expect(() => Registration.secretAndSaltFromResponse(response)).to.throw(Error, 'ENCRYPTION_SALT');
        });
        it('should throw an ENCRYPTION_SALT error given a response with empty RAMQ and MRNs', async function () {
            const response = {
                data: {
                    code: 'code1234',
                    hospital_patients: [
                        { mrn: '', is_active: true },
                    ],
                    patient: { ramq: '' },
                },
            };
            expect(() => Registration.secretAndSaltFromResponse(response)).to.throw(Error, 'ENCRYPTION_SALT');
        });
        it('should throw an ENCRYPTION_SALT error given a response with only inactive MRNs', async function () {
            const response = {
                data: {
                    code: 'code1234',
                    hospital_patients: [
                        { mrn: '1111111', is_active: false },
                        { mrn: '1111112', is_active: false },
                        { mrn: '1111113', is_active: false },
                    ],
                },
            };
            expect(() => Registration.secretAndSaltFromResponse(response)).to.throw(Error, 'ENCRYPTION_SALT');
        });
        it('should succeed when given a code and RAMQ', async function () {
            const response = {
                data: {
                    code: 'code1234',
                    patient: { ramq: 'OTES12345678' },
                },
            };
            expect(Registration.secretAndSaltFromResponse(response)).to.deep.equal({
                secret: 'code1234',
                salt: ['OTES12345678'],
            });
        });
        it('should succeed when given a code and RAMQ with extra hospital_patients info', async function () {
            const response = {
                data: {
                    code: 'code1234',
                    patient: { ramq: 'OTES12345678' },
                    hospital_patients: [
                        { other: 'test' },
                    ],
                },
            };
            expect(Registration.secretAndSaltFromResponse(response)).to.deep.equal({
                secret: 'code1234',
                salt: ['OTES12345678'],
            });
        });
        it('should succeed when given a code and MRN', async function () {
            const response = {
                data: {
                    code: 'code1234',
                    hospital_patients: [
                        { mrn: '1111111', is_active: true },
                    ],
                },
            };
            expect(Registration.secretAndSaltFromResponse(response)).to.deep.equal({
                secret: 'code1234',
                salt: ['1111111'],
            });
        });
        it('should succeed when given a complete response', async function () {
            const response = {
                data: {
                    code: 'code1234',
                    patient: { ramq: 'OTES12345678' },
                    hospital_patients: [
                        { mrn: '1111111', is_active: true },
                        { mrn: '1111112', is_active: true },
                        { mrn: '1111113', is_active: false },
                    ],
                },
            };
            expect(Registration.secretAndSaltFromResponse(response)).to.deep.equal({
                secret: 'code1234',
                salt: ['1111111', '1111112', 'OTES12345678'],
            });
        });
    });
    describe('decryptManySalts', function () {
        it('should fail when given a single wrong salt', async function () {
            const obj = clone(originalObj);
            await EncryptionUtilities.encryptResponse(context, obj, secret, 'salt');
            const promise = Registration.decryptManySalts(context, obj, { secret, salt: 'wrong-salt' });
            return expect(promise).to.be.rejectedWith(Error, 'DECRYPTION');
        });
        it("should fail when given a single salt, even if it's correct (an array is required)", async function () {
            const obj = clone(originalObj);
            await EncryptionUtilities.encryptResponse(context, obj, secret, 'salt');
            const promise = Registration.decryptManySalts(context, obj, { secret, salt: 'salt' });
            return expect(promise).to.be.rejectedWith(Error, 'DECRYPTION');
        });
        it('should fail when given an array of wrong salts', async function () {
            const obj = clone(originalObj);
            const saltArr = ['wrong1', 'wrong2', 'wrong3'];
            await EncryptionUtilities.encryptResponse(context, obj, secret, 'correct');
            const promise = Registration.decryptManySalts(context, obj, { secret, salt: saltArr });
            return expect(promise).to.be.rejectedWith(Error, 'DECRYPTION');
        });
        it('should succeed when given an array of salts containing the correct one', async function () {
            const obj = clone(originalObj);
            const saltArr = ['wrong1', 'wrong2', 'correct', 'wrong3'];
            await EncryptionUtilities.encryptResponse(context, obj, secret, 'correct');
            const result = await Registration.decryptManySalts(context, obj, { secret, salt: saltArr });
            return expect(result).to.deep.equal(originalObj);
        });
        it('should save the correct salt in encryptionInfo after a successful decryption', async function () {
            const obj = clone(originalObj);
            const saltArr = ['wrong1', 'wrong2', 'correct', 'wrong3'];
            const encryptionInfo = {
                secret,
                salt: saltArr,
            };
            await EncryptionUtilities.encryptResponse(context, obj, secret, 'correct');
            await Registration.decryptManySalts(context, obj, encryptionInfo);
            return expect(encryptionInfo).to.deep.equal({
                secret,
                salt: 'correct',
            });
        });
        it('should not alter the salt array in encryptionInfo after a failed decryption', async function () {
            const obj = clone(originalObj);
            const saltArr = ['wrong1', 'wrong2', 'wrong3'];
            const encryptionInfo = {
                secret,
                salt: saltArr,
            };
            await EncryptionUtilities.encryptResponse(context, obj, secret, 'correct');
            try {
                await Registration.decryptManySalts(context, obj, encryptionInfo);
            }
            // eslint-disable-next-line no-unused-vars
            catch (error) {
                // Suppress error (not the point of this test)
            }
            return expect(encryptionInfo).to.deep.equal({
                secret,
                salt: ['wrong1', 'wrong2', 'wrong3'],
            });
        });
    });

    after(function () {
        loggerSpy.restore();
        apiRequestStub.restore();
    });
});
