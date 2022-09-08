/**
 * @file Entry point used to launch the listener.
 * @author David Herrera, Robert Maglieri, Stacey Beard
 */

const config = require('./config/config.json');
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
    const firebase = new Firebase(config.FIREBASE);
    await firebase.init();
    Firebase.enableLogging(config.FIREBASE.ENABLE_LOGGING);

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
