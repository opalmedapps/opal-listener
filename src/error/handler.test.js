/* eslint-disable mocha/no-setup-in-describe */
require('../test/test-setup');
const { expect } = require('chai');
const ErrorHandler = require('./handler');
const { ERRORS } = require('./const');

describe('Error handler', function () {
    describe('getErrorResponse()', function () {
        it('Should return default unknowed listener error', function () {
            const result = ErrorHandler.getErrorResponse('NOT_A_REAL_ERROR_CODE');
            return expect(result.data.errorMessage).to.equal('UNKNOWN_ERROR');
        });
        Object.keys(ERRORS).forEach(item => {
            it(`Should return ${ERRORS[item].statusCode}: ${item}`, function () {
                const error = new Error(item);
                const result = ErrorHandler.getErrorResponse(error);
                return expect(result.status_code).to.equal(ERRORS[item].statusCode);
            });
        });
    });
});
