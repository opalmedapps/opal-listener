const legacyLogger = require('../../listener/logs/logger');
const { REQUEST_TYPE } = require('../const');
const { Version } = require('../utility/version');

/**
 * @description Object used to store all contextual information related to a single request from the Opal app.
 *
 *              Any basic information that is specific to a request and that needs to be accessed at any time
 *              during request processing can be added to this object.
 */
class RequestContext {
    constructor(requestType, requestObject) {
        this.requestType = requestType;
        this.userId = requestObject.UserID;
        this.deviceId = requestObject.DeviceId;
        this.branchName = requestObject.BranchName;

        // Label (key) under which to cache encryption information related to this request
        this.cacheLabel = this.#getCacheLabel();

        // Temporary variable for compatibility with app version 1.12.2
        this.useLegacyPBKDF2Settings = !!requestObject.AppVersion
            && Version.versionLessOrEqual(requestObject.AppVersion, Version.version_1_12_2);
    }

    #isRegistrationRequest() {
        return [REQUEST_TYPE.REGISTRATION, REQUEST_TYPE.REGISTRATION_LEGACY].includes(this.requestType);
    }

    #getCacheLabel() {
        let cacheLabel;
        const errorMsgRegistration = `Missing data to build cache label, branchName=${this.branchName}`;
        const errorMsgApp = `Missing data to build cache label, userId=${this.userId} and deviceId=${this.deviceId}`;

        if (this.#isRegistrationRequest()) {
            if (!this.branchName) throw new Error(errorMsgRegistration);
            cacheLabel = this.branchName;
        }
        else {
            if (!this.userId || !this.deviceId) throw new Error(errorMsgApp);
            cacheLabel = `${this.userId}:${this.deviceId}`;
        }
        legacyLogger.log('debug', `Cache label assembled: ${cacheLabel}`);
        return cacheLabel;
    }
}
exports.RequestContext = RequestContext;
