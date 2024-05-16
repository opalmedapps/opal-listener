/**
 * @file Entry point used to launch the listener.
 * @author David Herrera, Robert Maglieri, Stacey Beard
 */

require('dotenv').config();

const { ENVIRONMENT, FIREBASE_CONFIG, validateEnvironment } = require('./environment');
const { Firebase } = require('./firebase/firebase');
const legacyServer = require('../listener/legacy-server');
const legacyRegistrationServer = require('../legacy-registration/legacy-server');
const legacyLogger = require('../listener/logs/logger');
const { RequestHandler } = require('./core/request-handler');
const { REQUEST_TYPE } = require('./const');
const { Version } = require('./utility/version');

// Raise AssertionError if environment variables are not set
validateEnvironment(ENVIRONMENT);

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
    legacyLogger.log('info', `LISTENER VERSION: ${Version.getListenerVersion()}`);
    const firebase = new Firebase(FIREBASE_CONFIG);

    await firebase.init();
    Firebase.enableLogging(FIREBASE_CONFIG.FIREBASE_ENABLE_LOGGING);

    legacyLogger.log('debug', 'Setting Firebase request listeners');

    const requestHandler = new RequestHandler(firebase);
    // Still need pass the database reference to make the legacy-server work for the moment
    legacyServer.setFirebaseConnection(firebase.getDataBaseRef);
    legacyServer.listenForRequest('requests');
    legacyServer.listenForRequest('passwordResetRequests');

    requestHandler.listenForRequests(REQUEST_TYPE.API);
    requestHandler.listenForRequests(REQUEST_TYPE.REGISTRATION);

    legacyRegistrationServer.setFirebaseConnection(firebase);
    legacyRegistrationServer.listenForRequest('requests');

    legacyServer.spawnCronJobs();
}
