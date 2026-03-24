// SPDX-FileCopyrightText: Copyright 2022 Opal Health Informatics Group at the Research Institute of the McGill University Health Centre <john.kildea@mcgill.ca>
//
// SPDX-License-Identifier: AGPL-3.0-or-later

import '../test/chai-setup.js';
import { assert, stub } from 'sinon';
import ApiRequest from './api-request.js';
import Encryption from '../encryption/encryption.js';
import { expect } from 'chai';
import Registration from '../registration/registration.js';
import { REQUEST_TYPE } from '../const.js';
import RequestHandler from './request-handler.js';

describe('Request Handler', function () {
    describe('constructor', function () {
        it('should fail when Firebase is not initialized', function () {
            return expect(new RequestHandler({})).to.throw;
        });
    });
    describe('processRequest', function () {
        let handler;
        let encryptionValuesStub;
        let decryptionStub;
        let apiStub;
        let snapshot;

        before(function () {
            handler = new RequestHandler({
                getDataBaseRef: {
                    child: () => {
                        return {
                            set: () => {},
                        };
                    },
                },
            });
            const request = {
                UserID: 'User',
                DeviceId: 'Device',
                BranchName: 'Branch',
            };
            encryptionValuesStub = stub(Registration, 'getEncryptionValues');
            encryptionValuesStub.returns({
                secret: 'secret',
                salt: 'salt',
            });
            decryptionStub = stub(Encryption, 'decryptRequest');
            decryptionStub.returns(request);
            apiStub = stub(ApiRequest, 'makeRequest');
            apiStub.returns({});
            const snapshotPrototype = {};
            snapshot = Object.create(snapshotPrototype);
            snapshot.val = () => request;
            snapshot.key = 'key';
        });

        it('should execute without errors in a success case', async function () {
            await handler.processRequest(REQUEST_TYPE.REGISTRATION, snapshot);

            // TODO cover other function calls
            assert.calledOnce(encryptionValuesStub);
            assert.calledOnce(decryptionStub);
        });

        after(function () {
            encryptionValuesStub.restore();
            decryptionStub.restore();
            apiStub.restore();
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
