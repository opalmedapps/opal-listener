/**
     Filename     :   legacy-server.js
     Description  :   This script listens for changes on registration/ in firebase, reads those changes and writes a response back to firebase.
     Date         :   07 May 2019
     Copyright    :   Copyright 2016, HIG, All rights reserved.
     Licence      :   This file is subject to the terms and conditions defined in
                      file 'LICENSE.txt', which is part of this source code package.
 **/

/**  Library Imports **/

const admin = require('firebase-admin');

const mainRequestApi = require('./api/main.js');
const utility = require('./api/utility/utility.js');
const config = require('./config-adaptor.js');
const logger = require('../listener/logs/logger.js');
const { loggers } = require('./logs/logger.js');

const q = require("q");

// NOTE: Listener launching steps have been moved to src/server.js

let db;
let ref;

/*********************************************
 * FUNCTIONS
 *********************************************/

/**
 * @description Temporary function used to support the legacy structure of this file.
 *              Called by src/server.js to pass a Firebase database object to this file.
 * @param {Firebase} firebase The Firebase database object to use.
 */
 function setFirebaseConnection(firebase) {
    db = firebase.database;
    ref = db.ref(firebase.root + '/registration');
}
exports.setFirebaseConnection = setFirebaseConnection;

/** FUNCTIONS **/

/**
     listenForRequest
     @param requestType
     @desc Listen for firebase changes and send responses for requests
 **/

function listenForRequest(requestType) {
    logger.log('info', 'Starting registration/' + requestType + ' listener.');
    console.log(ref.child(requestType).toString())
    ref.child(requestType).on('child_added',
        function (snapshot) {
            logger.log('debug', 'Received request from Firebase: ', JSON.stringify(snapshot.val()));
            logger.log('info', 'Received request from Firebase: ', snapshot.val().Request);

            handleRequest(requestType, snapshot);
        },
        function (error) {
            logError(error);
        });
}
exports.listenForRequest = listenForRequest;

/**
     handleRequest
     @description Enqueues request for processing.
     @param requestType
     @param snapshot
 **/
function handleRequest(requestType, snapshot) {
    logger.log('debug', 'Handling firebase request');

    const headers = { key: snapshot.key, objectRequest: snapshot.val() };

    processRequest(headers).then(function (response) {

        // Log before uploading to Firebase. Check that it was not a simple log
        if (response.Headers.RequestObject.Request !== 'Log') logResponse(response);
        uploadToFirebase(response, requestType);
    });
}

/**
     logResponse
     @param response
     @desc logs every successful response the listener handles
 **/
function logResponse(response) {
    // Log before uploading to Firebase. Check that it was not a simple log
    if (response.Headers.RequestObject.Request !== 'Log') {
        logger.log('debug', "Completed response", {
            userID: response.Headers.RequestObject.UserID,
            request: response.Headers.RequestObject.Request +
                (response.Headers.RequestObject.Request === 'Refresh' ? ": " + response.Headers.RequestObject.Parameters.Fields.join(' ') : ""),
            requestKey: response.Headers.RequestKey
        });
        logger.log('info', "Completed response", response.Headers.RequestObject.Request);
    }
}

/**
     logError
     @param err
     @param requestObject
     @param requestKey
     @desc logs every error the listener encounters
 **/
function logError(err, requestObject, requestKey) {
    err = JSON.stringify(err);
    logger.log("error", "Error processing request!", {
        error: err,
        request: requestObject.Request,
        requestKey: requestKey
    });
}

/**
     processRequest
     @param headers
     @desc takes in the request read from Firebase and routes it to the correct API handler
 **/
function processRequest(headers) {

    // logger.log('debug', 'Processing request: ' + JSON.stringify(headers));
    logger.log('info', 'Processing request');

    const r = q.defer();
    const requestKey = headers.key;
    const requestObject = headers.objectRequest;
    mainRequestApi.apiRequestFormatter(requestKey, requestObject)
        .then(function (results) {
            logger.log('debug', 'Processed request successfully with response: ' + JSON.stringify(results));
            r.resolve(results);
        })
    //}
    return r.promise;
}

/**
     encryptResponse
     @desc Encrypts the response object before being uploaded to Firebase
     @param response
     @return {Promise}
 **/
function encryptResponse(response) {

    let encryptionKey = response.EncryptionKey;
    let salt = response.Salt;
    delete response.EncryptionKey;
    delete response.Salt;

    if (typeof encryptionKey !== 'undefined' && encryptionKey !== '') {
        return utility.encrypt(response, encryptionKey, salt);
    } else {
        return Promise.resolve(response);
    }
}

/**
     uploadToFirebase
     @param response
     @param key
     @desc Encrypt and upload the response to Firebase
 **/
function uploadToFirebase(response, key) {
    logger.log('debug', 'Uploading response to Firebase');

    return new Promise((resolve, reject) => {

        // Need to make a copy of the data, since the encryption key needs to be read
        const headers = JSON.parse(JSON.stringify(response.Headers));
        const requestKey = headers.RequestKey;

        logger.log('debug', 'Response header' + JSON.stringify(headers) + ' and requestKey  ' + requestKey);



        /** The last step before encrypting and uploading is checking that all keys are non-empty and contain
             no illegal characters. Otherwise, Firebase will throw an error. -SB
        **/
        const validResponse = validateKeysForFirebase(response);

        encryptResponse(validResponse).then((response) => {

            response.Timestamp = admin.database.ServerValue.TIMESTAMP;
            let responsePath = '';

            if (key === "requests") {
                const userId = headers.RequestObject.UserID;
                const responseBranchId = headers.RequestObject.BranchName;

                console.log(config);

                responsePath = config.firebaseBranch.responseChildBranch + '/' + requestKey;

                logger.log('debug', 'Firebase response branch: ' + responsePath);
            }

            logger.log('debug', 'Response header**' + JSON.stringify(headers) + ' and requestKey  ' + requestKey);

            //delete responsePath;
             delete response.Headers.RequestObject;

            ref.child(responsePath).set(response).then(function () {
                logger.log('debug', 'Uploaded to firebase with response header' + JSON.stringify(response));

                completeRequest(headers, key);

                delete responsePath;
                resolve('done');
            }).catch(function (error) {
                logger.log('error', 'Error writing to firebase', { error: error });
                reject(error);
            });
        }).catch((err) => {
            logger.log('error', 'Error writing to firebase', { error: err });
            reject(err);
        });
    });
}

/**
     validateKeysForFirebase
     @author Stacey Beard
     @desc Validates all keys in an object intended to be pushed to Firebase.
           Empty keys are replaced with 'MISSING_KEY' and illegal characters are replaced with '_'.
           This function edits the object directly (does not return a copy).
           Note: recursion would have been neater but calling recursion multiple times in a for loop doesn't work in
           JavaScript.
     @param objectToValidate
     @returns {*} objectToValidate with keys modified to be acceptable to Firebase
 **/
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


/**
     incrementStringParenthesisNumber
     @author Stacey Beard
     @desc Utility function that takes as input a string and increments its ending number (in parenthesis),
           like when saving a file of the same name as another in Windows.
           Examples:
             hello --> hello (1)
             hello (1) --> hello (2)
             hello 1 --> hello 1 (1)
             hello 1 (1) --> hello 1 (2)
           To use: call this function in a while loop:
             while(inputString is found in a list) inputString = incrementStringParenthesisNumber(inputString)
     @param {string} stringToIncrement
     @returns {string} copy of stringToIncrement with an incremented parenthesis number at the end
 **/
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
     Sets the request reference to null after uploading response
     @param headers
     @param key
     @return {Promise}
 **/
function completeRequest(headers, key) {
    logger.log('debug', 'Removing request from Firebase after uploading response: ' + key);

    return ref.child(key).child(headers.RequestKey).set(null)
        .catch(function (error) {
            logger.log('error', 'Error writing to firebase', { error: error });
        });
}



