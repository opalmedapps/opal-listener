// SPDX-FileCopyrightText: Copyright 2022 Opal Health Informatics Group at the Research Institute of the McGill University Health Centre <john.kildea@mcgill.ca>
//
// SPDX-License-Identifier: AGPL-3.0-or-later

import '../test/chai-setup.js';
import { assert, spy, stub } from 'sinon';
import ApiRequest from './api-request.js';
import Encryption from '../encryption/encryption.js';
import { expect } from 'chai';
import keyDerivationCache from '../utility/key-derivation-cache.js';
import Registration from '../registration/registration.js';
import { REQUEST_TYPE } from '../const.js';
import RequestHandler from './request-handler.js';
import Translation from '../translation/translation.js';

describe('Request Handler', function () {
    let handler;
    before(function () {
        // Handler with a mocked behavior to do nothing when setting or getting values from Firebase
        handler = new RequestHandler({
            getDataBaseRef: {
                child: () => {
                    return {
                        off: () => {},
                        on: () => {},
                        set: () => {},
                        child: () => {
                            return {
                                set: () => {},
                            };
                        },
                    };
                },
            },
        });
    });

    describe('constructor', function () {
        it('should fail when Firebase is not initialized', function () {
            return expect(new RequestHandler({})).to.throw;
        });
    });
    describe('listenForRequests', function () {
        it('should succeed when called', function () {
            handler.listenForRequests(REQUEST_TYPE.API);
        });
    });
    describe('clearRequest', function () {
        it('should succeed when called', async function () {
            await handler.clearRequest(REQUEST_TYPE.API, 'test');
        });
    });
    describe('processRequest', function () {
        let registrationEncryptionStub;
        let apiEncryptionStub;
        let decryptionStub;
        let apiStub;
        let registrationDecryptionSpy;
        let cacheSpy;
        let encryptionSpy;
        let sendResponseSpy;

        /**
         * @description Mocks a Firebase snapshot object to return a specific request.
         * @param {string} requestType One of the types defined in REQUEST_TYPE,
         *                             which will affect the parameters in the request.
         * @returns {object} An object used as a mock for a Firebase snapshot.
         */
        function mockRequestSnapshot(requestType) {
            // Mock request to be processed by the RequestHandler
            let request = {
                UserID: 'User',
                DeviceId: 'Device',
            };

            if (requestType === REQUEST_TYPE.REGISTRATION) {
                request.BranchName = 'Branch';
                request.Parameters = {};
                request.Parameters.url = '/api/registration/A0AAAAAAAAAA/';
            }

            // Mock of a Firebase snapshot object
            const snapshotPrototype = {};
            const snapshot = Object.create(snapshotPrototype);
            snapshot.val = () => request;
            snapshot.key = 'key';

            // Decryption isn't directly tested here, so make sure the plain request is returned after a decryption call
            decryptionStub.returns(Promise.resolve(request));

            return snapshot;
        }

        before(function () {
            // Stubs for functions that are not directly tested in this file
            registrationEncryptionStub = stub(Registration, 'getEncryptionValues');
            registrationEncryptionStub.returns({
                secret: 'secret',
                salt: ['salt-1', 'salt-2'],
            });
            apiEncryptionStub = stub(Encryption, 'getEncryptionInfo');
            apiEncryptionStub.returns({
                secret: 'secret',
                salt: 'salt',
            });
            decryptionStub = stub(Encryption, 'decryptRequest');
            apiStub = stub(ApiRequest, 'makeRequest');
            apiStub.returns({ key_EN: 'data' });

            // Spies for functions we expect to be called
            registrationDecryptionSpy = spy(Registration, 'decryptManySalts');
            cacheSpy = spy(keyDerivationCache, 'invalidate');
            encryptionSpy = spy(Encryption, 'encryptResponse');
            sendResponseSpy = spy(handler, 'sendResponse');
        });

        it('should be able to handle multiple possible salts for a registration-type request', async function () {
            const snapshot = mockRequestSnapshot(REQUEST_TYPE.REGISTRATION);
            await handler.processRequest(REQUEST_TYPE.REGISTRATION, snapshot);
            assert.calledOnce(registrationEncryptionStub);
            assert.calledOnce(registrationDecryptionSpy);
        });

        it('should invalidate cached encryption info on a first registration-type request', async function () {
            const snapshot = mockRequestSnapshot(REQUEST_TYPE.REGISTRATION);
            await handler.processRequest(REQUEST_TYPE.REGISTRATION, snapshot);
            assert.calledOnce(cacheSpy);
        });

        it('should execute successfully for an API-type request', async function () {
            const snapshot = mockRequestSnapshot(REQUEST_TYPE.API);
            await handler.processRequest(REQUEST_TYPE.API, snapshot);
            assert.calledOnce(apiEncryptionStub);
            assert.calledOnce(decryptionStub);
        });

        it('should continue execution if an error occurs while translating response attributes', async function () {
            const translationStub = stub(Translation, 'translateContent');
            translationStub.throws();

            const snapshot = mockRequestSnapshot(REQUEST_TYPE.API);
            await handler.processRequest(REQUEST_TYPE.API, snapshot);

            // Execution has continued if we reach the encryption step
            assert.calledOnce(encryptionSpy);
            translationStub.restore();
        });

        it('should handle unexpected errors without encrypting them', async function () {
            apiStub.throws({ message: 'DEFAULT_ERROR' });
            const expectedResult = {
                status_code: 500,
                data: {
                    errorMessage: 'UNEXPECTED_ERROR',
                    errorData: {
                        message: 'DEFAULT_ERROR',
                    },
                },
                encrypt: false,
            };

            const snapshot = mockRequestSnapshot(REQUEST_TYPE.API);
            await handler.processRequest(REQUEST_TYPE.API, snapshot);

            assert.calledWith(sendResponseSpy, expectedResult);
        });

        it('should be able to handle errors that can be encrypted', async function () {
            apiStub.throws({ message: 'API_NOT_FOUND' });

            const snapshot = mockRequestSnapshot(REQUEST_TYPE.API);
            await handler.processRequest(REQUEST_TYPE.API, snapshot);

            assert.calledOnce(encryptionSpy);
        });

        afterEach(function () {
            registrationEncryptionStub.resetHistory();
            apiEncryptionStub.resetHistory();
            decryptionStub.resetHistory();
            apiStub.resetHistory();
            cacheSpy.resetHistory();
            encryptionSpy.resetHistory();
            sendResponseSpy.resetHistory();
        });

        after(function () {
            registrationEncryptionStub.restore();
            apiEncryptionStub.restore();
            decryptionStub.restore();
            apiStub.restore();
            cacheSpy.restore();
            encryptionSpy.restore();
            sendResponseSpy.restore();
        });
    });
    describe('validateSnapshot', function () {
        it("should throw an error if snapshot has no 'key' attribute", function () {
            return expect(() => RequestHandler.validateSnapshot({ Request: '' })).to.throw('SNAPSHOT_VALIDATION');
        });
        it('should throw an error if snapshot is empty', function () {
            return expect(() => RequestHandler.validateSnapshot({})).to.throw('SNAPSHOT_VALIDATION');
        });
        it('should throw an error if snapshot is undefined', function () {
            return expect(() => RequestHandler.validateSnapshot(undefined)).to.throw('SNAPSHOT_VALIDATION');
        });
        it('should throw an error if snapshot is not an object', function () {
            return expect(() => RequestHandler.validateSnapshot('test')).to.throw('SNAPSHOT_VALIDATION');
        });
    });
});
