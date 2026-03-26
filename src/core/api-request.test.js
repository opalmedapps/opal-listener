// SPDX-FileCopyrightText: Copyright 2022 Opal Health Informatics Group at the Research Institute of the McGill University Health Centre <john.kildea@mcgill.ca>
//
// SPDX-License-Identifier: AGPL-3.0-or-later

import '../test/chai-setup.js';
import ApiRequest from './api-request.js';
import { expect } from 'chai';
import { stub } from 'sinon';

const REQUEST = {
    AppVersion: '100.100.100',
    Request: 'api',
    UserID: 'test',
    Parameters: {
        method: 'get',
        url: '/api/test',
        headers: {
            'Content-Type': 'application/json',
            'Accept-Language': 'fr',
        },
        params: {
            example: 'param',
        },
        data: {
            example: 'request',
        },
    },
    UserEmail: 'test@opalmedapps.ca',
};

describe('ApiRequest', function () {
    describe('makeRequest', function () {
        let axiosStub;

        before(function () {
            axiosStub = stub(ApiRequest, 'axios');
        });

        it('should throw an error given an invalid request', async function () {
            return expect(ApiRequest.makeRequest({})).to.throw;
        });
        it('should throw a BAD_REQUEST error given a 400 response', async function () {
            axiosStub.throws({
                code: 'ERR_BAD_REQUEST',
                headers: {},
                response: {
                    status: 400,
                    statusText: 'Bad Request',
                },
            });
            return expect(ApiRequest.makeRequest(REQUEST)).to.be.rejectedWith('BAD_REQUEST');
        });
        it('should throw an API_NOT_FOUND error given a 404 response', async function () {
            axiosStub.throws({
                code: 'ERR_BAD_REQUEST',
                headers: {},
                response: {
                    status: 404,
                    statusText: 'Not Found',
                },
            });
            return expect(ApiRequest.makeRequest(REQUEST)).to.be.rejectedWith('API_NOT_FOUND');
        });
        it('should throw an API_UNALLOWED error given a 403 response', async function () {
            axiosStub.throws({
                code: 'ERR_BAD_REQUEST',
                headers: {},
                response: {
                    status: 403,
                    statusText: 'Forbidden',
                },
            });
            return expect(ApiRequest.makeRequest(REQUEST)).to.be.rejectedWith('API_UNALLOWED');
        });
        it('should throw an API_NOT_AVAILABLE error given an ECONNREFUSED response', async function () {
            axiosStub.throws({
                code: 'ECONNREFUSED',
                headers: {},
            });
            return expect(ApiRequest.makeRequest(REQUEST)).to.be.rejectedWith('API_NOT_AVAILABLE');
        });
        it('should throw an API_NOT_AVAILABLE error given an ECONNRESET response', async function () {
            axiosStub.throws({
                code: 'ECONNRESET',
                headers: {},
            });
            return expect(ApiRequest.makeRequest(REQUEST)).to.be.rejectedWith('API_NOT_AVAILABLE');
        });
        it('should execute successfully given a valid request', async function () {
            axiosStub.returns({
                status: 200,
                statusText: 'OK',
                headers: {
                    'content-type': 'application/json',
                    'content-language': 'en',
                },
                data: {
                    example: 'response',
                },
            });
            const response = await ApiRequest.makeRequest(REQUEST);
            const requiredProperties = ['status_code', 'headers', 'data'];
            requiredProperties.forEach(property => {
                expect(response, 'response is missing a required property').to.have.property(property);
            });
        });

        afterEach(function () {
            axiosStub.resetHistory();
        });

        after(function () {
            axiosStub.restore();
        });
    });

    describe('sendRequestToApi', function () {
        it('should throw an error when failing to connect to the backend api', async function () {
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
