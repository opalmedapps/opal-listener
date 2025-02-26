/* eslint-disable no-new */
/* eslint-disable consistent-return */
require('../test/test-setup');
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
