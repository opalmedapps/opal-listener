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
        this.cacheLabel = this.#buildCacheLabel();

        // Temporary variable for compatibility with app version 1.12.2
        this.useLegacyPBKDF2Settings = !!requestObject.AppVersion
            && Version.versionLessOrEqual(requestObject.AppVersion, Version.version_1_12_2);
    }

    #isRegistrationRequest() {
        return [REQUEST_TYPE.REGISTRATION, REQUEST_TYPE.REGISTRATION_LEGACY].includes(this.requestType);
    }

    #buildCacheLabel() {
        let cacheLabel;

        if (this.#isRegistrationRequest()) {
            // For registration requests, branchName should always be defined
            if (!this.branchName) throw new Error(`Missing data to build cache label, branchName=${this.branchName}`);
            cacheLabel = this.branchName;
        }
        else {
            // For app requests, if some info is missing, cacheLabel stays undefined and the cache is later bypassed.
            // This is normal for some request types that are encrypted differently, such as security requests.
            if (!this.userId || !this.deviceId) cacheLabel = undefined;
            cacheLabel = `${this.userId}:${this.deviceId}`;
        }
        legacyLogger.log('debug', `Cache label assembled: ${cacheLabel}`);
        return cacheLabel;
    }
}
exports.RequestContext = RequestContext;
