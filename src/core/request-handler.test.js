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
        it('Should return false if snapshot as no key', function () {
            return expect(RequestHandler.validateSnapshot({ Request: '' })).to.be.false;
        });
        it('Should return false when snapshot is empty', function () {
            return expect(RequestHandler.validateSnapshot({})).to.be.false;
        });
        it('Should return false when snapshot is undefined', function () {
            return expect(RequestHandler.validateSnapshot(undefined)).to.be.false;
        });
    });
});
