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

    process.send('Clear Response Cron Successfully Initialized');

    // Periodically clear requests that are still on Firebase
    setInterval(function(){
        clearResponses(ref);
    }, 300000);
}

/**
 * clearTimeoutRequests
 * @desc Erase response data on firebase in case the response has not been processed
 * @param ref The Firebase reference from which to clear data.
 */
function clearResponses(ref) {
    ref.child('users').once('value').then(function(snapshot){
        const now = (new Date()).getTime();
        const usersData = snapshot.val();
        for (const user in usersData) {
            for(const requestKey in usersData[user])
            {
                if(usersData[user][requestKey].hasOwnProperty('Timestamp')&&now-usersData[user][requestKey].Timestamp>300000)
                {
                    logger.log('verbose','Deleting leftover response on firebase', {
                        request: requestKey
                    });
                    ref.child('users/'+user+'/'+requestKey).set(null);
                }
            }
        }
    });
}
