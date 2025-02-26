/**
 * @file Entry point used to launch the listener.
 * @author David Herrera, Robert Maglieri, Stacey Beard
 */

const config = require('./config/config.json');
const { Firebase } = require('./firebase/firebase');
const legacyServer = require('../listener/legacy-server');
const legacyRegistrationServer = require('../legacy-registration/legacy-server');
const logger = require('../listener/logs/logger');

launch().then(() => {
    logger.log('info', 'LISTENER LAUNCHED SUCCESSFULLY');
}).catch(error => {
    logger.log('error', 'FAILED TO LAUNCH', error);
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

    logger.log('debug', 'Setting Firebase request listeners');

    legacyServer.setFirebaseConnection(firebase);
    legacyServer.listenForRequest('requests');
    legacyServer.listenForRequest('passwordResetRequests');
    legacyRegistrationServer.setFirebaseConnection(firebase);
    legacyRegistrationServer.listenForRequest('requests');
    legacyServer.spawnCronJobs();
}
