// SPDX-FileCopyrightText: Copyright 2022 Opal Health Informatics Group at the Research Institute of the McGill University Health Centre <john.kildea@mcgill.ca>
//
// SPDX-License-Identifier: AGPL-3.0-or-later

/**
 * @file Unit tests for the Firebase class.
 */

import '../test/chai-setup.js';
import admin from 'firebase-admin';
import { expect } from 'chai';
import Firebase from './firebase.js';
import sinon from 'sinon';
import ValidationError from '../utility/param-validator-error.js';

describe('Firebase', function () {
    before(function () {
        sinon.stub(admin.credential, 'cert');
        let initializeAppStub = sinon.stub(admin, 'initializeApp');
        initializeAppStub.returns({
            database: () => {
                return {
                    getRules: () => 'test',
                    ref: path => path,
                };
            },
        });
    });

    describe('init', function () {
        it('should fail when DATABASE_URL config is missing', function () {
            const firebase = new Firebase(buildConfigObject(undefined, 'path', 'root'));
            return expect(firebase.init()).to.be.rejectedWith(ValidationError);
        });

        it('should fail when DATABASE_URL config is empty', function () {
            const firebase = new Firebase(buildConfigObject('', 'path', 'root'));
            return expect(firebase.init()).to.be.rejectedWith(ValidationError);
        });

        it('should fail when DATABASE_URL config is not a url', function () {
            const firebase = new Firebase(buildConfigObject('not a url', 'path', 'root'));
            return expect(firebase.init()).to.be.rejectedWith(ValidationError);
        });

        it('should fail when ADMIN_KEY_PATH config is missing', function () {
            const firebase = new Firebase(buildConfigObject('https://www.google.ca/', undefined, 'root'));
            return expect(firebase.init()).to.be.rejectedWith(ValidationError);
        });

        it('should fail when ADMIN_KEY_PATH config is empty', function () {
            const firebase = new Firebase(buildConfigObject('https://www.google.ca/', '', 'root'));
            return expect(firebase.init()).to.be.rejectedWith(ValidationError);
        });

        it('should fail when ROOT_BRANCH config is missing', function () {
            const firebase = new Firebase(buildConfigObject('https://www.google.ca/', 'path', undefined));
            return expect(firebase.init()).to.be.rejectedWith(ValidationError);
        });

        it('should fail when ROOT_BRANCH config is empty', function () {
            const firebase = new Firebase(buildConfigObject('https://www.google.ca/', 'path', ''));
            return expect(firebase.init()).to.be.rejectedWith(ValidationError);
        });

        it('should succeed when given non-failing arguments', function () {
            const firebase = new Firebase(buildConfigObject('https://www.google.ca/', 'path', 'root'));
            return expect(firebase.init()).to.be.fulfilled;
        });
    });

    describe('getDataBaseRef', function () {
        // Used for test coverage
        it('should succeed when called', async function () {
            const firebase = new Firebase(buildConfigObject('https://www.google.ca/', 'path', 'root'));
            await firebase.init();
            return expect(firebase.getDataBaseRef).to.be.ok;
        });
    });

    describe('getDatabaseTimeStamp', function () {
        // Used for test coverage
        it('should succeed when called', async function () {
            return expect(Firebase.getDatabaseTimeStamp).to.be.ok;
        });
    });

    describe('enableLogging', function () {
        // Used for test coverage
        it('should succeed when called', async function () {
            return expect(() => Firebase.enableLogging(true)).to.not.throw();
        });
    });
});

/**
 * @description Test utility function that quickly builds a Firebase config object for testing.
 * @param {string} databaseUrl Value of config.DATABASE_URL
 * @param {string} adminKeyPath Value of config.ADMIN_KEY_PATH
 * @param {string} rootBranch Value of config.ROOT_BRANCH
 * @returns {object} An object made up of the provided configurations.
 */
function buildConfigObject(databaseUrl, adminKeyPath, rootBranch) {
    const config = {};
    if (databaseUrl) config.DATABASE_URL = databaseUrl;
    if (adminKeyPath) config.ADMIN_KEY_PATH = adminKeyPath;
    if (rootBranch) config.ROOT_BRANCH = rootBranch;
    return config;
}
