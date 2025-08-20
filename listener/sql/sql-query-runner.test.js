// SPDX-FileCopyrightText: Copyright 2025 Opal Health Informatics Group at the Research Institute of the McGill University Health Centre <john.kildea@mcgill.ca>
//
// SPDX-License-Identifier: AGPL-3.0-or-later

import '../../src/test/chai-setup.js';
import { assert, expect } from 'chai';
import logger from '../logs/logger.js';
import sinon from 'sinon';
import SQLQueryRunner from './sql-query-runner.js';

let loggerSpy;
let queryRunner;

let logMessage = type => `The query's parameter has a prohibited type: ${type}.`;

describe('SQLQueryRunner', function() {
    describe('run', function() {
        // List of basic types accepted as parameters to the run function, and a sample value for each
        let basicValidTypes = {
            string: 'test',
            number: 1,
            boolean: true,
            bigint: 10000000000000000n,
            undefined: undefined,
        }

        before(function() {
            loggerSpy = sinon.spy(logger, 'log');
            queryRunner = new SQLQueryRunner();
        });

        // Dynamic test set that checks all basic valid data types
        for (const [type, param] of Object.entries(basicValidTypes)) {
            it(`should succeed validation if given a valid ${type} as a parameter`, function() {
                expect(typeof param).to.equal(type);
                queryRunner.run('Fake query', [param]);
                sinon.assert.neverCalledWith(loggerSpy, 'error', logMessage(typeof param));
            });
        }

        // Tests for the remaining (more specific) data types
        it('should succeed validation if given a valid date as a parameter', function() {
            let param = new Date();
            // Note: a Date is considered to have type 'object'
            expect(typeof param).to.equal('object');
            queryRunner.run('Fake query', [param]);
            sinon.assert.neverCalledWith(loggerSpy, 'error', logMessage(typeof param));
        });
        it('should succeed validation if given an array as a parameter', function() {
            let param = [1, 2];
            expect(Array.isArray(param)).to.be.true;
            let promise = queryRunner.run('Fake query', [param]);
            // Note: an array is considered to have type 'object'
            sinon.assert.neverCalledWith(loggerSpy, 'error', logMessage(typeof param));
        });
        it('should fail validation if given an object as a parameter', function() {
            let param = {
                test: 1
            };
            expect(typeof param).to.equal('object');
            let promise = queryRunner.run('Fake query', [param]);
            sinon.assert.calledWith(loggerSpy, 'error', logMessage(typeof param));
            assert.isRejected(promise, 'An error occurred while processing the request.');
        });

        afterEach(function() {
            loggerSpy.resetHistory();
        })
    });
});
