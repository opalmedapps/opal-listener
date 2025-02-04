// eslint-disable-next-line max-len
// SPDX-FileCopyrightText: Copyright 2022 Opal Health Informatics Group at the Research Institute of the McGill University Health Centre <john.kildea@mcgill.ca>
//
// SPDX-License-Identifier: AGPL-3.0-or-later

/**
 * @file Provides environment validation and exposes environment configuration objects.
 */
const assert = require('assert');

/**
 * @description The full list of required .env variables for configuring the listener
 */
const ENVIRONMENT = {
    FIREBASE_DATABASE_URL: process.env.FIREBASE_DATABASE_URL,
    FIREBASE_ADMIN_KEY_PATH: process.env.FIREBASE_ADMIN_KEY_PATH,
    FIREBASE_ROOT_BRANCH: process.env.FIREBASE_ROOT_BRANCH,
    FIREBASE_ENABLE_LOGGING: process.env.FIREBASE_ENABLE_LOGGING,
    BACKEND_HOST: process.env.BACKEND_HOST,
    BACKEND_LISTENER_AUTH_TOKEN: process.env.BACKEND_LISTENER_AUTH_TOKEN,
    BACKEND_REGISTRATION_AUTH_TOKEN: process.env.BACKEND_REGISTRATION_AUTH_TOKEN,
    DATA_CACHE_TIME_TO_LIVE_MINUTES: process.env.DATA_CACHE_TIME_TO_LIVE_MINUTES,
    DATABASE_USE_SSL: process.env.DATABASE_USE_SSL,
    SSL_CA: process.env.SSL_CA,
    QUESTIONNAIRE_COMPLETED_URL: process.env.QUESTIONNAIRE_COMPLETED_URL,
    FEEDBACK_EMAIL: process.env.FEEDBACK_EMAIL,
    FEEDBACK_EMAIL_HOST: process.env.FEEDBACK_EMAIL_HOST,
    FEEDBACK_EMAIL_PORT: process.env.FEEDBACK_EMAIL_PORT,
    OPAL_CHECKIN_URL: process.env.OPAL_CHECKIN_URL,
    ORMS_ENABLED: process.env.ORMS_ENABLED === '1',
    SOURCE_SYSTEM_SUPPORTS_CHECKIN: process.env.SOURCE_SYSTEM_SUPPORTS_CHECKIN === '1',
};

/**
 * @description The list of .env variables for configuring the listener that are required when ORMS_ENABLED=1
 */
const ENVIRONMENT_ORMS = {
    CHECKIN_ROOM: process.env.CHECKIN_ROOM,
    ORMS_CHECKIN_URL: process.env.ORMS_CHECKIN_URL,
};

/**
 * @description The list of .env variables for configuring the listener
 * that are required when SOURCE_SYSTEM_SUPPORTS_CHECKIN=1
 */
const ENVIRONMENT_SOURCE_SYSTEM_CHECKIN = {
    SOURCE_SYSTEM_CHECKIN_URL: process.env.SOURCE_SYSTEM_CHECKIN_URL,
};

/**
 * @description The firebase-specific environment object
 */
const FIREBASE_CONFIG = {
    DATABASE_URL: process.env.FIREBASE_DATABASE_URL,
    ADMIN_KEY_PATH: process.env.FIREBASE_ADMIN_KEY_PATH,
    ROOT_BRANCH: process.env.FIREBASE_ROOT_BRANCH,
    ENABLE_LOGGING: process.env.FIREBASE_ENABLE_LOGGING === 'true',
};

/**
 * @description Validate the listener environment by checking all
 *              specified environment variables for truthy-ness
 * @param {object} processArr - Environment variables to be validated
 * @throws {assert.AssertionError}
 */
function validateEnvironment(processArr) {
    Object.keys(processArr).forEach(key => {
        assert.ok(processArr[key] !== undefined && processArr[key] !== '', `${key} variable must be defined in .env`);
    });
}

module.exports = {
    ENVIRONMENT,
    ENVIRONMENT_SOURCE_SYSTEM_CHECKIN,
    ENVIRONMENT_ORMS,
    FIREBASE_CONFIG,
    validateEnvironment,
};
