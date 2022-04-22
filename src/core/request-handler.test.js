require('../test/test-setup');
const { expect } = require('chai');
const { RequestHandler } = require('./request-handler');

describe('Request Handler', function () {
    describe('#processSecurityRequest()', function () {
        it('Should reject promise when trying to process security request', function () {
            return expect(RequestHandler.processSecurityRequest()).to.be.rejected;
        });
    });
    describe('#processRequest()', function () {
        it('Should reject promise when trying to process regular request', function () {
            return expect(RequestHandler.processRequest()).to.be.rejected;
        });
    });
});
