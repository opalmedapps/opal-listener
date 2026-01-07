// SPDX-FileCopyrightText: Copyright 2022 Opal Health Informatics Group at the Research Institute of the McGill University Health Centre <john.kildea@mcgill.ca>
//
// SPDX-License-Identifier: AGPL-3.0-or-later

/**
 * @file Unit tests for the Versions class.
 */

import '../test/chai-setup.js';
import { expect } from 'chai';
import fs from 'fs';
import sinon from 'sinon';
import Version from './version.js';

describe('Version', function () {
    describe('compareVersions', function () {
        it('should fail if a version contains a negative number', function () {
            const v1 = '1.2.3';
            const v2 = '1.-2.3';
            expect(() => Version.compareVersions(v1, v2)).to.throw(
                'Version strings must be of format "major.minor.patch"',
            );
        });
        it('should fail if a version contains illegal characters', function () {
            const v1 = '1.2.a';
            const v2 = '0.0.0';
            expect(() => Version.compareVersions(v1, v2)).to.throw(
                'Version strings must be of format "major.minor.patch"',
            );
        });
        it('should return -1 when v1 < v2 (small difference)', function () {
            expect(Version.compareVersions('0.2.0', '0.2.1')).to.equal(-1);
        });
        it('should return -1 when v1 < v2 (big difference)', function () {
            expect(Version.compareVersions('2.9.1', '4.0.1')).to.equal(-1);
        });
        it('should return 0 when v1 = v2', function () {
            expect(Version.compareVersions('2.9.9', '2.9.9')).to.equal(0);
        });
        it('should return 0 when v1 = v2 (version 0.0.0)', function () {
            expect(Version.compareVersions('0.0.0', '0.0.0')).to.equal(0);
        });
        it('should return 1 when v1 > v2 (small difference)', function () {
            expect(Version.compareVersions('1.13.1', '1.12.1')).to.equal(1);
        });
        it('should return 1 when v1 > v2 (big difference)', function () {
            expect(Version.compareVersions('9.0.3', '0.6.4')).to.equal(1);
        });
    });

    describe('versionGreaterThan', function () {
        it('should return true when greater', function () {
            expect(Version.versionGreaterThan('1.0.0', '0.1.0')).to.be.true;
        });
        it('should return false when equal', function () {
            expect(Version.versionGreaterThan('1.0.0', '1.0.0')).to.be.false;
        });
        it('should return false when lesser', function () {
            expect(Version.versionGreaterThan('0.1.0', '1.0.0')).to.be.false;
        });
    });

    describe('versionGreaterOrEqual', function () {
        it('should return true when greater', function () {
            expect(Version.versionGreaterOrEqual('1.0.0', '0.1.0')).to.be.true;
        });
        it('should return true when equal', function () {
            expect(Version.versionGreaterOrEqual('1.0.0', '1.0.0')).to.be.true;
        });
        it('should return false when lesser', function () {
            expect(Version.versionGreaterOrEqual('0.1.0', '1.0.0')).to.be.false;
        });
    });

    describe('versionLessThan', function () {
        it('should return false when greater', function () {
            expect(Version.versionLessThan('1.0.0', '0.1.0')).to.be.false;
        });
        it('should return false when equal', function () {
            expect(Version.versionLessThan('1.0.0', '1.0.0')).to.be.false;
        });
        it('should return true when lesser', function () {
            expect(Version.versionLessThan('0.1.0', '1.0.0')).to.be.true;
        });
    });

    describe('versionLessOrEqual', function () {
        it('should return false when greater', function () {
            expect(Version.versionLessOrEqual('1.0.0', '0.1.0')).to.be.false;
        });
        it('should return true when equal', function () {
            expect(Version.versionLessOrEqual('1.0.0', '1.0.0')).to.be.true;
        });
        it('should return true when lesser', function () {
            expect(Version.versionLessOrEqual('0.1.0', '1.0.0')).to.be.true;
        });
    });

    describe('getListenerVersion', function () {
        it('should read a version number in the correct format', function () {
            const version = Version.getListenerVersion();
            const regex = /^\d+$/;

            // The first and last character should not be periods
            expect(version.charAt(0)).to.not.equal('.', 'Version number should not start with a period');
            expect(version.charAt(version.length - 1)).to.not.equal('.', 'Version number should not end with a period');

            // All other characters between periods should be digits
            const versionParts = version.split('.');
            versionParts.forEach(part => {
                expect(
                    regex.test(part),
                    'Version number should contain only digits and periods; '
                    + `"${part}" is not a sequence of one or more digits`,
                ).to.be.true;
            });
        });
        it('should return undefined if reading the version file fails', function () {
            const stub = sinon.stub(fs, 'readFileSync');
            stub.throws();
            const version = Version.getListenerVersion();
            expect(version).to.be.undefined;
        });
    });
});
