require('../test/chai-setup');
const { expect } = require('chai');
const { RequestContext } = require('./request-context');
const { REQUEST_TYPE } = require('../const');

const registrationRequestTypes = [
    REQUEST_TYPE.REGISTRATION,
    REQUEST_TYPE.REGISTRATION_LEGACY,
];

const appRequestTypes = [
    REQUEST_TYPE.API,
    REQUEST_TYPE.LEGACY,
];

describe('RequestContext', function () {
    registrationRequestTypes.forEach(requestType => {
        describe(`constructor, registration requests (${requestType})`, function () {
            it('should use the branchName as cacheLabel', function () {
                const context = new RequestContext(requestType, {
                    BranchName: 'branch-name',
                });
                expect(context.cacheLabel).to.equal('branch-name');
            });
            it('should fail given a request without a branchName', function () {
                expect(() => new RequestContext(requestType, {})).to.throw('Missing data to build cache label');
            });
            it("shouldn't use legacy PBKDF2 settings for registration requests", function () {
                // Note that registration requests don't use an AppVersion attribute
                const context = new RequestContext(requestType, {
                    BranchName: 'branch-name',
                });
                expect(context.useLegacyPBKDF2Settings).to.be.false;
            });
        });
    });
    appRequestTypes.forEach(requestType => {
        describe(`constructor, app requests (${requestType})`, function () {
            it('should use the userId and deviceId as cacheLabel', function () {
                const context = new RequestContext(requestType, {
                    UserID: 'user-id',
                    DeviceId: 'device-id',
                });
                expect(context.cacheLabel).to.equal('user-id:device-id');
            });
            it('should not fail if the user ID is missing (to allow security requests)', function () {
                const createContext = () => new RequestContext(requestType, {
                    DeviceId: 'device-id',
                });
                expect(createContext).not.to.throw();
            });
            it('should not fail if the device ID is missing (to allow security requests)', function () {
                const createContext = () => new RequestContext(requestType, {
                    UserID: 'user-id',
                });
                expect(createContext).not.to.throw();
            });
            it('should enable legacy PBKDF2 settings for old app requests', function () {
                const context = new RequestContext(requestType, {
                    AppVersion: '1.12.2',
                });
                expect(context.useLegacyPBKDF2Settings).to.be.true;
            });
            it('should not enable legacy PBKDF2 settings for new app requests', function () {
                const context = new RequestContext(requestType, {
                    AppVersion: '1.12.3',
                });
                expect(context.useLegacyPBKDF2Settings).to.be.false;
            });
        });
    });
});
