const chai = require('chai');
const chaiAsPromised = require('chai-as-promised');
chai.use(chaiAsPromised);
const { expect } = require('chai');

const utility = require('../utility/utility.js');

describe('Legacy Utility', function () {
    describe('addSeveralToArray', function () {
        it('should add the right number of elements to an array', function() {
            let arr = ['a', 'b', 'c', 'd'];
            let item = "e";
            let amount = 4;
            let newArr = utility.addSeveralToArray(arr, item, amount);
            expect(newArr).to.have.members(['a', 'b', 'c', 'd', 'e', 'e', 'e', 'e']);
        });

        it('should not alter the original array', function() {
            let originalArr = ['a', 'b'];
            let item = "c";
            let amount = 5;
            utility.addSeveralToArray(originalArr, item, amount);
            expect(originalArr).to.have.members(['a', 'b']);
        });

        it('should have no effect if asked to add 0 objects', function() {
            let arr = ['a', 'b', 'c', 'd'];
            let item = "e";
            let amount = 0;
            let newArr = utility.addSeveralToArray(arr, item, amount);
            expect(newArr).to.have.members(['a', 'b', 'c', 'd']);
        });
    });

    describe('compareVersions', function() {
        it('should fail when provided with inputs of different lengths (number of parts)', function() {
            let v1 = '1.2.3.4';
            let v2 = '1.2.3';
            expect(() => utility.compareVersions(v1, v2)).to.throw('Cannot compare two version strings with a different number of parts (dots)');
        });
        it('should fail if a version contains a negative number', function() {
            let v1 = '1.2.3';
            let v2 = '1.-2.3';
            expect(() => utility.compareVersions(v1, v2)).to.throw('Version strings must contain only digits and dots');
        });
        it('should fail if a version contains illegal characters', function() {
            let v1 = '1.2.a';
            let v2 = '0.0.0';
            expect(() => utility.compareVersions(v1, v2)).to.throw('Version strings must contain only digits and dots');
        });
        it('should return -1 when v1 < v2 (small difference)', function() {
            expect(utility.compareVersions('0.2.0', '0.2.1')).to.equal(-1);
        });
        it('should return -1 when v1 < v2 (big difference)', function() {
            expect(utility.compareVersions('2.9.1', '4.0.1')).to.equal(-1);
        });
        it('should return 0 when v1 = v2', function() {
            expect(utility.compareVersions('2.9.9', '2.9.9')).to.equal(0);
        });
        it('should return 0 when v1 = v2 (version 0.0.0)', function() {
            expect(utility.compareVersions('0.0.0', '0.0.0')).to.equal(0);
        });
        it('should return 1 when v1 > v2 (small difference)', function() {
            expect(utility.compareVersions('1.13.1', '1.12.1')).to.equal(1);
        });
        it('should return 1 when v1 > v2 (big difference)', function() {
            expect(utility.compareVersions('9.0.3', '0.6.4')).to.equal(1);
        });
    });

    describe('versionGreaterThan', function() {
        it('should return true when greater', function() {
            expect(utility.versionGreaterThan('1.0.0', '0.1.0')).to.be.true;
        });
        it('should return false when equal', function() {
            expect(utility.versionGreaterThan('1.0.0', '1.0.0')).to.be.false;
        });
        it('should return false when lesser', function() {
            expect(utility.versionGreaterThan('0.1.0', '1.0.0')).to.be.false;
        });
    });

    describe('versionGreaterOrEqual', function() {
        it('should return true when greater', function() {
            expect(utility.versionGreaterOrEqual('1.0.0', '0.1.0')).to.be.true;
        });
        it('should return true when equal', function() {
            expect(utility.versionGreaterOrEqual('1.0.0', '1.0.0')).to.be.true;
        });
        it('should return false when lesser', function() {
            expect(utility.versionGreaterOrEqual('0.1.0', '1.0.0')).to.be.false;
        });
    });

    describe('versionLessThan', function() {
        it('should return false when greater', function() {
            expect(utility.versionLessThan('1.0.0', '0.1.0')).to.be.false;
        });
        it('should return false when equal', function() {
            expect(utility.versionLessThan('1.0.0', '1.0.0')).to.be.false;
        });
        it('should return true when lesser', function() {
            expect(utility.versionLessThan('0.1.0', '1.0.0')).to.be.true;
        });
    });

    describe('versionLessOrEqual', function() {
        it('should return false when greater', function() {
            expect(utility.versionLessOrEqual('1.0.0', '0.1.0')).to.be.false;
        });
        it('should return true when equal', function() {
            expect(utility.versionLessOrEqual('1.0.0', '1.0.0')).to.be.true;
        });
        it('should return true when lesser', function() {
            expect(utility.versionLessOrEqual('0.1.0', '1.0.0')).to.be.true;
        });
    });
});
