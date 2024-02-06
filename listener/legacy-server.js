/*
 * Filename     :   legacy-server.js
 * Description  :   This script listens for changes to config.FIREBASE_ROOT_BRANCH in firebase, reads those changes and
 *                  writes a response back to firebase.
 * Created by   :   David Herrera, Robert Maglieri
 * Date         :   07 Mar 2017
 * Copyright    :   Copyright 2016, HIG, All rights reserved.
 * Licence      :   This file is subject to the terms and conditions defined in
 *                  file 'LICENSE.txt', which is part of this source code package.
 *
 * *********************************************
 * Modified By    	: Yick Mo
 * Modified Date	: 2017-12-15
 * NOTES			: Added the Heart Beat Database
 *
 * Important		: Do not forget to change "/dev3" back to "/dev2" before merging. [Done]
 * *********************************************
 *
 */

const mainRequestApi    = require('./api/main.js');
const processApi        = require('./api/processApiRequest');
const admin             = require("firebase-admin");
const utility           = require('./utility/utility.js');
const q                 = require("q");
const logger            = require('./logs/logger.js');
const cp                = require('child_process');
const OpalSecurityResponseError = require('./api/response/security-response-error');
const OpalSecurityResponseSuccess = require('./api/response/security-response-success');
const OpalResponse      = require('./api/response/response');
const { Version } = require('../src/utility/version');


// NOTE: Listener launching steps have been moved to src/server.js

let db;
let ref;
let heartbeatRef;

/*********************************************
 * FUNCTIONS
 *********************************************/

/**
 * @description Temporary function used to support the legacy structure of this file.
 *              Called by src/server.js to pass a Firebase database object to this file.
 * @param {Reference}} databaseRef The Firebase database reference to use.
 */
function setFirebaseConnection(databaseRef) {
    ref = databaseRef;
    heartbeatRef = ref.child('/users/heartbeat');
}
exports.setFirebaseConnection = setFirebaseConnection;

/**
 * listenForRequest
 * @param requestType
 * @desc Listen for firebase changes and send responses for requests
 */
function listenForRequest(requestType){
    logger.log('info',`Starting ${requestType} listener.`);

    //disconnect any existing listeners..
    ref.child(requestType).off();

    ref.child(requestType).on('child_added',
        function(snapshot){
            logger.log('debug', 'Received request from Firebase: ', snapshot.val());
            logger.log('info', 'Received request from Firebase: ', snapshot.val().Request);
            if(snapshot.val().Request === 'HeartBeat'){
                logger.log('debug', 'Handling heartbeat request');
                handleHeartBeat(snapshot.val())
            } else {
                handleRequest(requestType,snapshot);
            }
        },
        function(error){
            logger.log('error', `Failed to read 'child_added' snapshot while listening to '${requestType}'`, error);
        });
}
exports.listenForRequest = listenForRequest;

/**
 * handleRequest
 * @description Enqueues request for processing.
 * @param requestType
 * @param snapshot
 */
function handleRequest(requestType, snapshot){
    logger.log('debug', 'Handling request');

    const headers = {key: snapshot.key, objectRequest: snapshot.val()};

    // Temporary code for compatibility with app version 1.12.2
    let useLegacySettings = Version.versionLessOrEqual(headers.objectRequest.AppVersion, Version.version_1_12_2);

    processRequest(headers).then(function(response){

        // Print the response contents (shortened if too long)
        try {
            console.log("response", JSON.parse(utility.stringifyShort(response)));
        }
        catch (error) {
            console.error("Failed to print the response due to a formatting issue:", error);
        }

        // Log before uploading to Firebase. Check that it was not a simple log
        // if (response.Headers.RequestObject.Request !== 'Log') logResponse(response);
        uploadToFirebase(response, requestType, useLegacySettings);
    });
}
exports.handleRequest = handleRequest;

/**
 * logResponse
 * @param response
 * @desc logs every successful response the listener handles
 */
function logResponse(response){
	// Log before uploading to Firebase. Check that it was not a simple log
	if (response.Headers.RequestObject.Request !== 'Log') {
		logger.log('debug', "Completed response", {
			deviceID: response.Headers.RequestObject.DeviceId,
			userID: response.Headers.RequestObject.UserID,
			request: response.Headers.RequestObject.Request +
			(response.Headers.RequestObject.Request === 'Refresh' ? ": " + response.Headers.RequestObject.Parameters.Fields.join(' ') : ""),
			requestKey: response.Headers.RequestKey
		});
        logger.log('info', "Completed response", response.Headers.RequestObject.Request);
	}
}

/**
 * processRequest
 * @param headers
 * @desc takes in the request read from Firebase and routes it to the correct API handler
 */
function processRequest(headers){

    logger.log('info', 'Processing request');

    const r = q.defer();
    const requestKey = headers.key;
    const requestObject = headers.objectRequest;
    const unexpectedErrorMsg = 'Unexpected error or response during security request';
    const unexpectedError = new OpalSecurityResponseError(
        OpalResponse.CODE.SERVER_ERROR,
        'An unexpected error occurred',
        requestKey,
        requestObject,
    );

    // Separate security requests from main requests
    if(processApi.securityAPI.hasOwnProperty(requestObject.Request)) {

        // Log all requests in the table PatientActivityLog. -SB
        processApi.logPatientRequest(requestObject);

        logger.log('debug', 'Processing security request');
        processApi.securityAPI[requestObject.Request](requestKey, requestObject)
            .then(function (response) {
                if (response instanceof OpalSecurityResponseSuccess) r.resolve(response.toLegacy());
                else {
                    logger.log('error', unexpectedErrorMsg, response);
                    r.resolve(unexpectedError.toLegacy());
                }
            })
            .catch(function (error) {
                logger.log('error', 'Processing security request failed', error);
                if (error instanceof OpalSecurityResponseError) r.resolve(error.toLegacy());
                else {
                    logger.log('error', unexpectedErrorMsg, error);
                    r.resolve(unexpectedError.toLegacy());
                }
            });
    } else {

        logger.log('debug', 'Processing general request');
        mainRequestApi.apiRequestFormatter(requestKey, requestObject)
            .then(function(results){

                logger.log('debug', `results: ${utility.stringifyShort(results)}`);
                r.resolve(results);
            })
    }
    return r.promise;
}

/**
 * encryptResponse
 * @desc Encrypts the response object before being uploaded to Firebase
 * @param response
 * @param {boolean} useLegacySettings [Temporary, compatibility] If true, the old settings for PBKDF2 are used.
 *                                    Used for compatibility with app version 1.12.2.
 * @return {Promise}
 */
function encryptResponse(response, useLegacySettings = false)
{
	let encryptionKey = response.EncryptionKey;
	let salt = response.Salt;
	delete response.EncryptionKey;
	delete response.Salt;

	if (typeof encryptionKey !== 'undefined' && encryptionKey !== '') {
		return utility.encrypt(response, encryptionKey, salt, useLegacySettings);
	}
	else {
		return Promise.resolve(response);
	}
}
// Export for legacy-registration
exports.encryptResponse = encryptResponse;

/**
 * uploadToFirebase
 * @param response
 * @param key
 * @desc Encrypt and upload the response to Firebase
 */
function uploadToFirebase(response, key, useLegacySettings = false) {
    logger.log('debug', 'Uploading to Firebase');
	return new Promise((resolve, reject)=>{

		//Need to make a copy of the data, since the encryption key needs to be read
        const headers = JSON.parse(JSON.stringify(response.Headers));
        const requestKey = headers.RequestKey;

        /* The last step before encrypting and uploading is checking that all keys are non-empty and contain
         * no illegal characters. Otherwise, Firebase will throw an error. -SB
         */
        const validResponse = validateKeysForFirebase(response);

        encryptResponse(validResponse, useLegacySettings).then((response)=>{
			response.Timestamp = admin.database.ServerValue.TIMESTAMP;
            let path = '';
            if (key === "requests") {
                const userId = headers.RequestObject.UserID;
                path = 'users/'+userId+'/'+requestKey;
			} else if (key === "passwordResetRequests") {
				path = 'passwordResetResponses/'+requestKey;
			}

			delete response.Headers.RequestObject;

			logger.log('debug', path);

			ref.child(path).set(response).then(function(){
				logger.log('debug', 'Uploaded to firebase');
				completeRequest(headers, key);
				resolve('done');
			}).catch(function (error) {
				logger.error('Error writing to firebase', {error:error});
				reject(error);
			});
		}).catch((err)=>{
			logger.error('Error writing to firebase', {error:err});
			reject(err);
		});
	});
}
exports.uploadToFirebase = uploadToFirebase;
/**
 * validateKeysForFirebase
 * @author Stacey Beard
 * @date 2018-10-05
 * @desc Validates all keys in an object intended to be pushed to Firebase.
 *       Empty keys are replaced with 'MISSING_KEY' and illegal characters are replaced with '_'.
 *       This function edits the object directly (does not return a copy).
 *       Note: recursion would have been neater but calling recursion multiple times in a for loop doesn't work in
 *       JavaScript.
 * @param objectToValidate
 * @returns {*} objectToValidate with keys modified to be acceptable to Firebase
 */
function validateKeysForFirebase(objectToValidate) {

    // Create an array of objects to validate. This will contain the sub-objects within objectToValidate.
    let toValidate = [];
    toValidate.push(objectToValidate);

    // So long as there are sub-objects to validate, keep validating them
    while (toValidate.length > 0) {
        let obj = toValidate.pop();

        // Only do the validation if obj is an object with keys
        if (obj && typeof obj === "object" && Object.keys(obj).length > 0) {

            for (let key in obj) {
                // Replace empty keys with 'MISSING_KEY'
                if (key === "") {
                    obj["MISSING_KEY"] = obj[key];
                    delete obj[key];
                    // Add the sub-object to the stack to be processed
                    toValidate.push(obj["MISSING_KEY"]);
                }
                else {
                    /* Replace any of the following:
                       . # $ / [ ]
                       with an underscore
                    */
                    let newKey = key.replace(/[\.#\$\/\[\]]/g, '_');

                    // Only replace with the new key if the new key is different from the old
                    if (newKey !== key) {

                        // Also make sure that the new key isn't already being used in the object.
                        // If it is, increment it until we get a new unique key.
                        while (obj.hasOwnProperty(newKey)) newKey = incrementStringParenthesisNumber(newKey);

                        obj[newKey] = obj[key];
                        delete obj[key];
                        // Add the sub-object to the stack to be processed
                        toValidate.push(obj[newKey]);
                    }
                    else {
                        // Add the sub-object to the stack to be processed
                        toValidate.push(obj[key]);
                    }
                }
            } // Validate the next key in the sub-object
        }
    } // Validate the next sub-object in the stack until there are none left
    return objectToValidate;
}
// Export for legacy-registration
exports.validateKeysForFirebase = validateKeysForFirebase;

/**
 * incrementStringParenthesisNumber
 * @author Stacey Beard
 * @date 2018-10-05
 * @desc Utility function that takes as input a string and increments its ending number (in parenthesis),
 *       like when saving a file of the same name as another in Windows.
 *       Examples:
 *         hello --> hello (1)
 *         hello (1) --> hello (2)
 *         hello 1 --> hello 1 (1)
 *         hello 1 (1) --> hello 1 (2)
 *       To use: call this function in a while loop:
 *         while(inputString is found in a list) inputString = incrementStringParenthesisNumber(inputString)
 * @param {string} stringToIncrement
 * @returns {string} copy of stringToIncrement with an incremented parenthesis number at the end
 */
function incrementStringParenthesisNumber(stringToIncrement) {

    if (!stringToIncrement) return stringToIncrement;
    else {
        // Make sure we have a string to work with
        let str = stringToIncrement.toString();

        let newStr = "";

        // Search for a space followed by a parenthesis number
        let positionSpace = str.search(/\s\(\d+\)$/);
        // It was found
        if (positionSpace > -1) {
            // Get the position of the opening parenthesis
            let positionOpenParen = positionSpace + 1;
            // Get the position of the closing parenthesis
            let positionCloseParen = str.search(/\)$/);
            // Get the number in between parentheses
            let number = parseInt(str.substring(positionOpenParen + 1, positionCloseParen));
            // Create the incremented string
            let incrementedNumber = number + 1;
            newStr = str.substring(0, positionOpenParen + 1) + incrementedNumber + ")";
        }
        // It was not found
        else {
            newStr = str + " (1)";
        }
        return newStr;
    }
}

/**
 * Sets the request reference to null after uploading response
 * @param headers
 * @param key
 * @return {Promise}
 */
function completeRequest(headers, key)
{
    logger.log('debug', `Removing request from Firebase after uploading response: ${key}`);
	return ref.child(key).child(headers.RequestKey).set(null)
		.catch(function (error) {
			logger.error('Error writing to firebase', {error:error});
		});
}

function handleHeartBeat(data){
    "use strict";

	// Where to write the log file
	const filename = 'logs/heartbeat.log';
	var fs = require('fs');

    let HeartBeat = {};

    //Push Heartbeat Back To Firebase
    HeartBeat.CPU = process.cpuUsage();
    HeartBeat.Memory = process.memoryUsage();
    HeartBeat.Timestamp = data.Timestamp;

	// Log the results to the heart beat DB logs
	// NOTE: The logs are manage by using the  logrotate to control the settings of the log
	fs.appendFile(filename, JSON.stringify(HeartBeat)  + "\n", function (err) {
	  if (err) {
			// Log any errors
			logger.log('error', 'Error reporting heartbeat', err);
	  }
	});

    heartbeatRef.set(HeartBeat)
        .catch(err => {
            logger.log('error', 'Error reporting heartbeat', err)
        })

}


/*********************************************
 * CRON
 *********************************************/

/**
 * Spawns cron jobs:
 *  1) clearRequest: clears request from firebase that have not been handled within 5 minute period
 *  2) clearResponses: clears responses from firebase that have not been handled within 5 minute period
 *  3) heartbeat: sends heartbeat request to firebase every 30 secs to get information about listener
 *
*/
function spawnCronJobs(){
    spawnClearRequest();
    spawnClearResponses();
    spawnHeartBeat();
}
exports.spawnCronJobs = spawnCronJobs;

/**
 * @name spawnClearRequest
 * @desc creates clearRequest process that clears requests from firebase every 5 minutes
 */
function spawnClearRequest(){
    let clearRequests = cp.fork(`${__dirname}/cron/clearRequests.js`);

    // Handles clearRequest cron events
    clearRequests.on('message', (m) => {
        logger.log('info', 'PARENT got message:', m);
    });

    clearRequests.on('error', (m) => {
        logger.log('error','clearRequest cron error:', m);
        clearRequests.kill();
        if(clearRequests.killed){
            clearRequests = cp.fork(`${__dirname}/cron/clearRequests.js`);
        }
    });

    process.on('exit', function () {
        clearRequests.kill();
    });
}

/**
 * @name spawnClearResponse
 * @desc creates clearResponse process that clears responses from firebase every 5 minutes
 */
function spawnClearResponses(){
    let clearResponses = cp.fork(`${__dirname}/cron/clearResponses.js`);

    // Handles clearResponses cron events
    clearResponses.on('message', (m) => {
        logger.log('info','PARENT got message:', m);
    });

    clearResponses.on('error', (m) => {
        logger.log('error','clearResponse cron error:', m);

        clearResponses.kill();
        if(clearResponses.killed){
            clearResponses = cp.fork(`${__dirname}/cron/clearResponses.js`);
        }
    });

    process.on('exit', function () {
        clearResponses.kill();
    });
}

function spawnHeartBeat(){
    // create new Node child processs
    let heartBeat = cp.fork(`${__dirname}/cron/heartBeat.js`);

    // Handles heartBeat cron events
    heartBeat.on('message', (m) => {
        logger.log('info','PARENT got message:', m);
    });

    heartBeat.on('error', (m) => {
        logger.log('error','heartBeat cron error:', m);

        heartBeat.kill();
        if(heartBeat.killed){
            heartBeat = cp.fork(`${__dirname}/cron/heartBeat.js`);
        }
    });

    process.on('exit', function () {
        heartBeat.kill();
    });

}
