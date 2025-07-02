// SPDX-FileCopyrightText: Copyright 2022 Opal Health Informatics Group at the Research Institute of the McGill University Health Centre <john.kildea@mcgill.ca>
//
// SPDX-License-Identifier: AGPL-3.0-or-later

import '../test/chai-setup.js';
import { expect } from 'chai';
import PromiseUtility from './promise.js';

describe('PromiseUtility', function () {
    describe('promiseAnyWithIndex', function () {
        it('should resolve to the result of a single promise', async function () {
            const success = Promise.resolve('success');
            const { value, index } = await PromiseUtility.promiseAnyWithIndex(success);
            expect(index).to.equal(0);
            return expect(value).to.equal('success');
        });
        it('should reject an AggregateError for a single rejecting promise', async function () {
            const failure = Promise.reject(new Error('error'));
            return expect(PromiseUtility.promiseAnyWithIndex(failure)).to.be.rejectedWith(AggregateError);
        });
        it('should resolve to the only resolving promise in an array', async function () {
            const promises = [
                Promise.reject(new Error('error 1')),
                Promise.resolve('success 1'),
                Promise.reject(new Error('error 2')),
            ];
            const { value, index } = await PromiseUtility.promiseAnyWithIndex(promises);
            expect(index).to.equal(1);
            return expect(value).to.equal('success 1');
        });
        it('should resolve to the first promise to resolve in an array', async function () {
            const promises = [
                Promise.reject(new Error('error 1')),
                new Promise(resolve => {
                    setTimeout(() => resolve('success 1'), 300);
                }),
                Promise.reject(new Error('error 2')),
                Promise.resolve('success 2'),
            ];
            const { value, index } = await PromiseUtility.promiseAnyWithIndex(promises);
            expect(index).to.equal(3);
            return expect(value).to.equal('success 2');
        });
        it('should reject an AggregateError for several rejecting promises', async function () {
            const promises = [
                Promise.reject(new Error('error 1')),
                Promise.reject(new Error('error 2')),
                Promise.reject(new Error('error 3')),
            ];
            return expect(PromiseUtility.promiseAnyWithIndex(promises)).to.be.rejectedWith(AggregateError);
        });
    });
});
