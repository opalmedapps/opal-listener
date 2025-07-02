// eslint-disable-next-line max-len
// SPDX-FileCopyrightText: Copyright 2022 Opal Health Informatics Group at the Research Institute of the McGill University Health Centre <john.kildea@mcgill.ca>
//
// SPDX-License-Identifier: AGPL-3.0-or-later

/**
 * @file Entry point used to launch the listener.
 */

import 'dotenv/config';

import {
    ENVIRONMENT, ENVIRONMENT_DATABASE_SSL, ENVIRONMENT_ORMS, ENVIRONMENT_SOURCE_SYSTEM_CHECKIN, FIREBASE_CONFIG, validateEnvironment,
} from './environment.js';

import Firebase from './firebase/firebase.js';
import legacyLogger from '../listener/logs/logger.js';
import { REQUEST_TYPE } from './const.js';
import Version from './utility/version.js';

// Validate environment before importing modules that use env variables on import
// E.g., SQL Query Runner establishes the connection on import,
// if the DB connection requires SSL but SSL_CA is undefined there will be an error.
// It gets imported indirectly via the below modules.
validateEnvironment(ENVIRONMENT);

if (ENVIRONMENT.DATABASE_USE_SSL) {
    validateEnvironment(ENVIRONMENT_DATABASE_SSL);
}

if (ENVIRONMENT.ORMS_ENABLED) {
    validateEnvironment(ENVIRONMENT_ORMS);
}

if (ENVIRONMENT.SOURCE_SYSTEM_SUPPORTS_CHECKIN) {
    validateEnvironment(ENVIRONMENT_SOURCE_SYSTEM_CHECKIN);
}

import legacyRegistrationServer from '../legacy-registration/legacy-server.js';
import legacyServer from '../listener/legacy-server.js';
import RequestHandler from './core/request-handler.js';

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
