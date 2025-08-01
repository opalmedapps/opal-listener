// SPDX-FileCopyrightText: Copyright 2022 Opal Health Informatics Group at the Research Institute of the McGill University Health Centre <john.kildea@mcgill.ca>
//
// SPDX-License-Identifier: AGPL-3.0-or-later

/**
 * @file Unit tests for the Registration class.
 */

import '../test/chai-setup.js';
import EncryptionUtilities from '../encryption/encryption.js';
import { expect } from 'chai';
import Registration from './registration.js';
import RequestContext from '../core/request-context.js';

const context = new RequestContext('test', {});

const originalObj = {
    Request: 'test',
    Parameters: {
        id: '1',
    },
};
const secret = 'secret';

describe('Registration', function () {
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
});

/**
 * @description Helper function that clones an object to encrypt. This is needed because encryption is done in place
 *              and alters the original object. To later compare to the original value, we need to encrypt a copy.
 * @param {object} obj The object to clone (must be parsable by JSON.stringify).
 * @returns {object} The cloned copy of the object.
 */
function clone(obj) {
    return JSON.parse(JSON.stringify(obj));
}
