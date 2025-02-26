// eslint-disable-next-line max-len
// SPDX-FileCopyrightText: Copyright 2022 Opal Health Informatics Group at the Research Institute of the McGill University Health Centre <john.kildea@mcgill.ca>
//
// SPDX-License-Identifier: AGPL-3.0-or-later

/**
 * @file Provides utility functions related to JavaScript Promises.
 */

class PromiseUtility {
    /**
     * @description Reimplementation of Promise.any() that informs the caller which of the promises has succeeded,
     *              by also returning its index.
     *              Background: Promise.any() is used to find the first Promise in an array to succeed, but it doesn't
     *              tell us which one succeeded.
     *              See: https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Promise/any
     * @param {Promise[]|Promise} promiseArray An array of promises where we only care about the first one to succeed
     *                                         (or if they all fail).
     * @returns {Promise<unknown>} Resolves to an object containing the value and index of the first promise to resolve,
     *                             or rejects with an AggregateError if all promises reject.
     */
    static async promiseAnyWithIndex(promiseArray) {
        const promises = Array.isArray(promiseArray) ? promiseArray : [promiseArray];
        return new Promise((resolve, reject) => {
            let first = true;
            promises.forEach((promise, index) => {
                promise.then(value => {
                    if (first) {
                        first = false;
                        resolve({ value, index });
                    }
                }).catch(() => {
                    // Empty catch block prevents uncaught errors being thrown by failed promises
                });
            });
            Promise.allSettled(promises).then(results => {
                if (results.every(result => result.status === 'rejected')) {
                    reject(new AggregateError(
                        results.map(result => result.reason),
                        'All Promises rejected',
                    ));
                }
            });
        });
    }
}

module.exports = PromiseUtility;
