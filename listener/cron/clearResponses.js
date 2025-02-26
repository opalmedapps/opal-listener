// SPDX-FileCopyrightText: Copyright 2017 Opal Health Informatics Group at the Research Institute of the McGill University Health Centre <john.kildea@mcgill.ca>
//
// SPDX-License-Identifier: AGPL-3.0-or-later


const logger            = require('../logs/logger.js');
const config            = require('../config-adaptor');
const admin             = require("firebase-admin");

// Initialize firebase connection
const serviceAccount = require(config.FIREBASE_ADMIN_KEY);
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
    clearResponses();
}, 300000);

/**
 * clearTimeoutRequests
 * @desc Erase response data on firebase in case the response has not been processed
 */
function clearResponses() {
    ref.child('users').once('value').then(function(snapshot){
        const now = (new Date()).getTime();
        const usersData = snapshot.val();
        for (const user in usersData) {
            for(const requestKey in usersData[user])
            {
                if(usersData[user][requestKey].hasOwnProperty('Timestamp')&&now-usersData[user][requestKey].Timestamp>300000)
                {
                    logger.log('info','Deleting leftover response on firebase', {
                        request: requestKey
                    });
                    ref.child('users/'+user+'/'+requestKey).set(null);
                }
            }
        }
    });
}
