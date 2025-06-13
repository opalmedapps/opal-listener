// SPDX-FileCopyrightText: Copyright 2017 Opal Health Informatics Group at the Research Institute of the McGill University Health Centre <john.kildea@mcgill.ca>
//
// SPDX-License-Identifier: AGPL-3.0-or-later

import admin from 'firebase-admin';
import config from '../config-adaptor.js';
import logger from '../logs/logger.js';

init();

async function init() {
    const { default: serviceAccount } = await import(config.FIREBASE_ADMIN_KEY, { with: { type: 'json' } });

    // Initialize firebase connection
    admin.initializeApp({
        credential: admin.credential.cert(serviceAccount),
        databaseURL: config.DATABASE_URL
    });

    // Get reference to correct data element
    const db = admin.database();
    const ref = db.ref(config.FIREBASE_ROOT_BRANCH);

    process.send('Clear Request Cron Successfully Initialized');

    // Periodically clear requests that are still on Firebase
    setInterval(function(){
        clearRequests(ref);
    }, 300000);
}

/**
 * clearRequests
 * @desc Erase requests data on firebase in case the request has not been processed
 * @param ref The Firebase reference from which to clear data.
 */
function clearRequests(ref) {
    logger.log('debug', 'clearRequest called');
    ref.child('requests').once('value').then(function(snapshot){
        const now = (new Date()).getTime();
        const requestData = snapshot.val();
        for (const requestKey in requestData) {
            if(requestData[requestKey].hasOwnProperty('Timestamp')&&now-requestData[requestKey].Timestamp>300000) {
                logger.log('verbose', 'Deleting leftover request on firebase', {
                    requestKey: requestKey
                });
                ref.child('requests/' + requestKey).set(null);
            }
        }
    });
}
