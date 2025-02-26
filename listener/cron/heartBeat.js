/**
 * Created by PhpStorm.
 * User: James Brace
 * Date: 2017-11-16
 * Time: 10:43 AM
 */

"use strict";

/**
 * HEARTBEAT DEPENDENCIES
 */
const admin    = require("firebase-admin");
const config   = require('./../config.json');
const logger   = require('./../logs/logger');


/**
 * FIREBASE INITIALIZATION
 */
// Initialize firebase connection
const serviceAccount = require(config.FIREBASE_ADMIN_KEY);
admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    databaseURL: config.DATABASE_URL
});
const db = admin.database();
const ref = db.ref(config.FIREBASE_ROOT_BRANCH).child("requests");


/**
 * HEARTBEAT REQUEST
 * @type {{Request: string, Timestamp: {[.sv]: string}}}
 */
const request = {
    "Request": "HeartBeat",
    "Timestamp": {".sv": "timestamp"}
};

/////////////////////////////////////

/**
 * START THE HEARTBEAT
 */
init();


/**
 * @name init
 * @desc sends message to parent process + starts heartbeat
 */
function init(){
    process.send('Heartbeat Cron Successfully Initialized');

    setInterval(() => {
        startHeartBeat()
    }, 600000)

}

/**
 * @name startHeartBeat
 * @desc sends heartbeat request to listener every 30 seconds
 */
function startHeartBeat(){

    logger.log('info', 'Requesting heartbeat from listener');

    ref.push(request)
        .then(()=>{
            logger.log('info', 'Successfully pushed heartbeat');
        })
        .catch(err => {
            logger.log('error', 'Error sending heartbeat request', {error: err});
        });
}
