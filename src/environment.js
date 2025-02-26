/**
 * @file Provides environment validation and exposes environment configuration objects.
 * @author Kelly Agnew
 */
const assert = require('assert');

/**
 * @description The full list of .env variables for configuring the listener
 */
const ENVIRONMENT = {
    FIREBASE_DATABASE_URL: process.env.FIREBASE_DATABASE_URL,
    FIREBASE_ADMIN_KEY_PATH: process.env.FIREBASE_ADMIN_KEY_PATH,
    FIREBASE_ROOT_BRANCH: process.env.FIREBASE_ROOT_BRANCH,
    FIREBASE_ENABLE_LOGGING: process.env.FIREBASE_ENABLE_LOGGING,
    OPAL_BACKEND_HOST: process.env.OPAL_BACKEND_HOST,
    OPAL_BACKEND_AUTH_TOKEN: process.env.OPAL_BACKEND_AUTH_TOKEN,
    DATA_CACHE_TIME_TO_LIVE_MINUTES: process.env.DATA_CACHE_TIME_TO_LIVE_MINUTES,
    DATABASE_USE_SSL: process.env.DATABASE_USE_SSL,
    SSL_CA: process.env.SSL_CA,
    CHECKIN_URL: process.env.CHECKIN_URL,
    QUESTIONNAIRE_COMPLETED_URL: process.env.QUESTIONNAIRE_COMPLETED_URL,
    ORMS_UPDATE_PATIENT_STATUS_URL: process.env.ORMS_UPDATE_PATIENT_STATUS_URL,
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
 * @throws {AssertionError}
 */
function validateEnvironment(processArr) {
    Object.keys(processArr).forEach(key => {
        assert.ok(processArr[key], `${key} variable must be defined in .env`);
    });
}

module.exports = {
    ENVIRONMENT,
    FIREBASE_CONFIG,
    validateEnvironment,
};
