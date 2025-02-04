// eslint-disable-next-line max-len
// SPDX-FileCopyrightText: Copyright 2024 Opal Health Informatics Group at the Research Institute of the McGill University Health Centre <john.kildea@mcgill.ca>
//
// SPDX-License-Identifier: AGPL-3.0-or-later

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
    /**
     * @description The general type of request, relating to a Firebase branch on which the request
     *              was received; one of the values in `src/const.js`.
     * @type {string}
     */
    requestType;

    /**
     * @description The Firebase username of the user making the request.
     *              Used only in app requests; undefined for registration.
     * @type {string}
     */
    userId;

    /**
     * @description The identifier of the device sending the request.
     *              Used only in app requests; undefined for registration.
     * @type {string}
     */
    deviceId;

    /**
     * @description The registration branch for this request (generally equal to the hash of the registration code).
     *              Used only in registration requests; undefined for app requests.
     * @type {string}
     */
    branchName;

    /**
     * @description A label (key) under which encryption information is cached for this request.
     * @type {string}
     */
    cacheLabel;

    /**
     * @description [Temporary, compatibility] If true, the old settings for PBKDF2 are used.
     *              Used for compatibility with app version 1.12.2.
     * @type {boolean}
     */
    useLegacyPBKDF2Settings;

    /**
     * @description Builds a RequestContext instance from a request object.
     * @param {string} requestType The general type of request (e.g., 'api', 'requests', etc.) defined in REQUEST_TYPE.
     * @param {object} requestObject The request object itself, i.e. the result of snapshot.val().
     */
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

    /**
     * @description Checks if this request was made for registration.
     * @returns {boolean} True if this request was received on a registration Firebase branch; false otherwise.
     */
    #isRegistrationRequest() {
        return [REQUEST_TYPE.REGISTRATION, REQUEST_TYPE.REGISTRATION_LEGACY].includes(this.requestType);
    }

    /**
     * @description Puts together a cache label, intended for assignment to this.cacheLabel.
     * @returns {string|undefined} A cache label for this request. The value may be undefined for some request types,
     *                             e.g. security requests. In this case, the cache will be bypassed later in the code.
     */
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
            if (!this.userId || !this.deviceId) return undefined;

            cacheLabel = `${this.userId}:${this.deviceId}`;
        }
        legacyLogger.log('debug', `Cache label assembled: ${cacheLabel}`);
        return cacheLabel;
    }
}
exports.RequestContext = RequestContext;
