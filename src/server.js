/**
 * @file Entry point used to launch the listener.
 * @author David Herrera, Robert Maglieri, Stacey Beard
 */

require('dotenv').config();
const assert = require('assert');

const environment = [
    process.env.FIREBASE_DATABASE_URL,
    process.env.FIREBASE_ADMIN_KEY_PATH,
    process.env.FIREBASE_ROOT_BRANCH,
    process.env.FIREBASE_ENABLE_LOGGING,
    process.env.OPAL_BACKEND_HOST,
    process.env.OPAL_BACKEND_AUTH_TOKEN];
// Raise AssertionError if environment variables are not set
validateEnvironment(environment);

const { AssertionError } = require('assert');
const { Firebase } = require('./firebase/firebase');
const legacyServer = require('../listener/legacy-server');
const legacyRegistrationServer = require('../legacy-registration/legacy-server');
const legacyLogger = require('../listener/logs/logger');
const { RequestHandler } = require('./core/request-handler');
const { REQUEST_TYPE } = require('./const');

launch().then(() => {
    legacyLogger.log('info', 'LISTENER LAUNCHED SUCCESSFULLY');
}).catch(error => {
    legacyLogger.log('error', 'FAILED TO LAUNCH', error);
    process.exit(1);
});

/**
 * @description Initializes the listener by connecting to Firebase and starting to listen for requests
 *              on certain branches.
 * @returns {Promise<void>}
 */
async function launch() {
    // Environment is already validated at this point, however env vars must be stored as strings
    // Therefore we have to convert any required strings to booleans at this point
    const loggingBoolean = (process.env.FIREBASE_ENABLE_LOGGING === 'true');
    const firebaseConfig = {
        DATABASE_URL: process.env.FIREBASE_DATABASE_URL,
        ADMIN_KEY_PATH: process.env.FIREBASE_ADMIN_KEY_PATH,
        ROOT_BRANCH: process.env.FIREBASE_ROOT_BRANCH,
        ENABLE_LOGGING: loggingBoolean,
    };

    const firebase = new Firebase(firebaseConfig);

    await firebase.init();
    Firebase.enableLogging(firebaseConfig.FIREBASE_ENABLE_LOGGING);

    legacyLogger.log('debug', 'Setting Firebase request listeners');

    const requestHandler = new RequestHandler(firebase);
    // Still need pass the database reference to make the legacy-server work for the moment
    legacyServer.setFirebaseConnection(firebase.getDataBaseRef);
    legacyServer.listenForRequest('requests');
    legacyServer.listenForRequest('passwordResetRequests');

    requestHandler.listenToRequests(REQUEST_TYPE.API);
    requestHandler.listenToRequests(REQUEST_TYPE.REGISTRATION);

    legacyRegistrationServer.setFirebaseConnection(firebase);
    legacyRegistrationServer.listenForRequest('requests');

    legacyServer.spawnCronJobs();
    legacyRegistrationServer.spawnCronJobs();
}

/**
 * @description Validate the listener environment by checking all
 *              specified environment variables for truthy-ness
 * @param {Array} processArr - Environment variables to be validated
 * @throws {AssertionError}
 */
function validateEnvironment(processArr) {
    processArr.forEach(element => {
        assert.ok(element, `${element} variable must be defined in .env`);
    });
}
