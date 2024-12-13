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
    BACKEND_HOST: process.env.BACKEND_HOST,
    BACKEND_LISTENER_AUTH_TOKEN: process.env.BACKEND_LISTENER_AUTH_TOKEN,
    BACKEND_REGISTRATION_AUTH_TOKEN: process.env.BACKEND_REGISTRATION_AUTH_TOKEN,
    DATA_CACHE_TIME_TO_LIVE_MINUTES: process.env.DATA_CACHE_TIME_TO_LIVE_MINUTES,
    DATABASE_USE_SSL: process.env.DATABASE_USE_SSL,
    SSL_CA: process.env.SSL_CA,
    QUESTIONNAIRE_COMPLETED_URL: process.env.QUESTIONNAIRE_COMPLETED_URL,
    OPAL_EMAIL: process.env.OPAL_EMAIL,
    SMTP_SERVER_IP: process.env.SMTP_SERVER_IP,
    SMTP_SERVER_PORT: process.env.SMTP_SERVER_PORT,
    ORMS_ENABLED: process.env.ORMS_ENABLED,
    SOURCE_SYSTEM_SUPPORTS_CHECKIN: process.env.SOURCE_SYSTEM_SUPPORTS_CHECKIN,
    CHECKIN_ROOM: process.env.CHECKIN_ROOM,
    OPAL_CHECKIN_URL: process.env.OPAL_CHECKIN_URL,
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
        assert.ok(processArr[key], `${key} variable must be defined in .env`);
    });
}

module.exports = {
    ENVIRONMENT,
    FIREBASE_CONFIG,
    validateEnvironment,
};
