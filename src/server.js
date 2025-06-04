// eslint-disable-next-line max-len
// SPDX-FileCopyrightText: Copyright 2022 Opal Health Informatics Group at the Research Institute of the McGill University Health Centre <john.kildea@mcgill.ca>
//
// SPDX-License-Identifier: AGPL-3.0-or-later

/**
 * @file Entry point used to launch the listener.
 */

import 'dotenv/config';

import {
    ENVIRONMENT, ENVIRONMENT_SOURCE_SYSTEM_CHECKIN, ENVIRONMENT_ORMS, FIREBASE_CONFIG, validateEnvironment,
} from './environment.js';

import Firebase from './firebase/firebase.js';
import legacyServer from '../listener/legacy-server.js';
import legacyRegistrationServer from '../legacy-registration/legacy-server.js';
import legacyLogger from '../listener/logs/logger.js';
import RequestHandler from './core/request-handler.js';
import { REQUEST_TYPE } from './const.js';
import Version from './utility/version.js';

// Raise AssertionError if environment variables are not set
validateEnvironment(ENVIRONMENT);

if (ENVIRONMENT.ORMS_ENABLED) {
    validateEnvironment(ENVIRONMENT_ORMS);
}

if (ENVIRONMENT.SOURCE_SYSTEM_SUPPORTS_CHECKIN) {
    validateEnvironment(ENVIRONMENT_SOURCE_SYSTEM_CHECKIN);
}

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
