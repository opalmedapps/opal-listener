/* eslint-disable consistent-return */
require('../test/test-setup');
const { expect } = require('chai');
const ApiRequest = require('./api-request');

describe('ApiRequest', function () {
    describe('makeRequest', function () {
        it('Should throw as error when a invalid request is pass to the function', async function () {
            return expect(ApiRequest.makeRequest({})).to.throw;
        });
    });

    describe('sendRequestToApi', function () {
        it('Should throw an error when failing to connect to the backend api', async function () {
            const userId = 'aksdjhaksd';
            const parameters = {
                method: 'get',
                url: '/api/app/home',
                headers: {
                    'Content-Type': 'application/json',
                    'Accept-Language': 'fr',
                },
            };
            return expect(ApiRequest.sendRequestToApi(userId, parameters)).to.throw;
        });
    });

    describe('filterOutHTML()', function () {
        it('Should filter out HTML error response and return null', function () {
            return expect(ApiRequest.filterOutHTML('<!DOCTYPE')).to.be.null;
        });
    });
});
