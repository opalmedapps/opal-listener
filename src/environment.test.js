// SPDX-FileCopyrightText: Copyright 2026 Opal Health Informatics Group at the Research Institute of the McGill University Health Centre <john.kildea@mcgill.ca>
//
// SPDX-License-Identifier: AGPL-3.0-or-later

import './test/chai-setup.js';
import { expect } from 'chai';
import { validateEnvironment } from './environment.js';

describe('Environment', function () {
    describe('validateEnvironment', function () {
        it('should succeed when all keys are defined', function () {
            validateEnvironment({
                FIREBASE_DATABASE_URL: 'example-value',
                SOURCE_SYSTEM_SUPPORTS_CHECKIN: true,
                FALLBACK_LANGUAGE: 'EN',
            });
        });
        it('should fail when a key is undefined', function () {
            expect(() => validateEnvironment({
                FIREBASE_DATABASE_URL: 'example-value',
                SOURCE_SYSTEM_SUPPORTS_CHECKIN: true,
                FALLBACK_LANGUAGE: undefined,
            })).to.throw('FALLBACK_LANGUAGE variable must be defined in .env');
        });
        it('should fail when a key is defined as a blank string', function () {
            expect(() => validateEnvironment({
                FIREBASE_DATABASE_URL: '',
                SOURCE_SYSTEM_SUPPORTS_CHECKIN: true,
                FALLBACK_LANGUAGE: 'EN',
            })).to.throw('FIREBASE_DATABASE_URL variable must be defined in .env');
        });
    });
});
