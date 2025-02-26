// eslint-disable-next-line max-len
// SPDX-FileCopyrightText: Copyright 2022 Opal Health Informatics Group at the Research Institute of the McGill University Health Centre <john.kildea@mcgill.ca>
//
// SPDX-License-Identifier: AGPL-3.0-or-later

/* eslint-disable no-new */
/* eslint-disable consistent-return */
require('../test/chai-setup');
const { expect } = require('chai');
const { RequestHandler } = require('./request-handler');

describe('Request Handler', function () {
    describe('processRequest()', function () {
        it('Should throw error when trying to process request when Firebase is not initialize', function () {
            return expect(new RequestHandler({})).to.throw;
        });
    });
    describe('validateSnapshot', function () {
        it("Should throw an error if snapshot has no 'key' attribute", function () {
            return expect(() => RequestHandler.validateSnapshot({ Request: '' })).to.throw('SNAPSHOT_VALIDATION');
        });
        it('Should throw an error if snapshot is empty', function () {
            return expect(() => RequestHandler.validateSnapshot({})).to.throw('SNAPSHOT_VALIDATION');
        });
        it('Should throw an error if snapshot is undefined', function () {
            return expect(() => RequestHandler.validateSnapshot(undefined)).to.throw('SNAPSHOT_VALIDATION');
        });
        it('Should throw an error if snapshot is not an object', function () {
            return expect(() => RequestHandler.validateSnapshot('test')).to.throw('SNAPSHOT_VALIDATION');
        });
    });
});
