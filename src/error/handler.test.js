// SPDX-FileCopyrightText: Copyright 2022 Opal Health Informatics Group at the Research Institute of the McGill University Health Centre <john.kildea@mcgill.ca>
//
// SPDX-License-Identifier: AGPL-3.0-or-later

import '../test/chai-setup.js';
import ErrorHandler from './handler.js';
import ERRORS from './const.js';
import { expect } from 'chai';

describe('Error handler', function () {
    describe('getErrorResponse()', function () {
        it('Should return an unexpected error when given an unknown error code', function () {
            const result = ErrorHandler.getErrorResponse('NOT_A_REAL_ERROR_CODE');
            return expect(result.data.errorMessage).to.equal('UNEXPECTED_ERROR');
        });
        it('Should return an unexpected error when given undefined', function () {
            const result = ErrorHandler.getErrorResponse(undefined);
            return expect(result.data.errorMessage).to.equal('UNEXPECTED_ERROR');
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
