/**
 * @file Entry point used to launch the listener.
 * @author David Herrera, Robert Maglieri, Stacey Beard
 */

require('dotenv').config();

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
    const firebaseConfig = {
        DATABASE_URL: process.env.FIREBASE_DATABASE_URL,
        ADMIN_KEY_PATH: process.env.FIREBASE_ADMIN_KEY_PATH,
        ROOT_BRANCH: process.env.FIREBASE_ROOT_BRANCH,
        ENABLE_LOGGING: process.env.FIREBASE_ENABLE_LOGGING,
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
