/**
 * @file Entry point used to launch the listener.
 * @author David Herrera, Robert Maglieri, Stacey Beard
 */

const config                  = require('./config/config');
const { Firebase }            = require('./firebase/firebase');
const legacyServer            = require('../listener/server');
const logger                  = require('../listener/logs/logger');

launch();


/**
 * @description Initializes the listener by connecting to Firebase and starting to listen for requests
 *              on certain branches.
 * @returns {Promise<void>}
 */
async function launch() {
    try {
        const firebase = new Firebase(config.FIREBASE);
        await firebase.init();
        Firebase.enableLogging(config.FIREBASE.ENABLE_LOGGING);

        logger.log('debug', 'Setting Firebase request listeners');

        legacyServer.setFirebaseConnection(firebase);
        legacyServer.listenForRequest('requests');
        legacyServer.listenForRequest('passwordResetRequests');
        legacyServer.spawnCronJobs();

        logger.log('info', 'LISTENER LAUNCHED SUCCESSFULLY');
    }
    catch (error) {
        console.error("Failed to launch the Opal listener: ", error);
        process.exit(1);
    }
}
