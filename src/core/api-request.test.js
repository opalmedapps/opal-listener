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
        it('should filter HTML and return only the text in the summary div', function () {
            return expect(ApiRequest.filterOutHTML(`
                <!DOCTYPE html>
                <html>
                    <head></head>
                    <body>
                        <p id="summary">Summary text</p>
                        <p id="details">More details</p>
                        <p>etc.</p>
                    </body>
                </html>
            `)).to.equal('Summary text');
        });
        it('should filter HTML and return blank if there is no summary div', function () {
            return expect(ApiRequest.filterOutHTML(`
                <!DOCTYPE html>
                <html>
                    <head></head>
                    <body>
                        <p>Content</p>
                    </body>
                </html>
            `)).to.equal('');
        });
        it('should return the same object when not HTML', function () {
            return expect(ApiRequest.filterOutHTML({ test: 1 })).to.deep.equal({ test: 1 });
        });
        it('should return the same string when not HTML', function () {
            return expect(ApiRequest.filterOutHTML('value')).to.equal('value');
        });
    });
});
