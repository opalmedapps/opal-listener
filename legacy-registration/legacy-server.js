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
const listenerLegacyServer = require('../listener/legacy-server');

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
        const validResponse = listenerLegacyServer.validateKeysForFirebase(response);

        listenerLegacyServer.encryptResponse(validResponse).then((response) => {

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



