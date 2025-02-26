// SPDX-FileCopyrightText: Copyright 2016 Opal Health Informatics Group at the Research Institute of the McGill University Health Centre <john.kildea@mcgill.ca>
//
// SPDX-License-Identifier: AGPL-3.0-or-later

// This script listens for changes on registration/ in firebase, reads those changes and writes a response back to firebase.

/**  Library Imports **/

const admin = require('firebase-admin');

const mainRequestApi = require('./api/main.js');
const logger = require('../listener/logs/logger.js');
const listenerLegacyServer = require('../listener/legacy-server');
const { REQUEST_TYPE } = require('../src/const.js');
const { RequestContext } = require('../src/core/request-context.js');

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
    const context = new RequestContext(REQUEST_TYPE.REGISTRATION_LEGACY, snapshot.val());

    processRequest(context, headers).then(function (response) {

        // Log before uploading to Firebase. Check that it was not a simple log
        if (response.Headers.RequestObject.Request !== 'Log') logResponse(response);
        uploadToFirebase(context, response);
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
 * processRequest
 * @description Takes the request read from Firebase and routes it to the correct API handler.
 * @param {RequestContext} context The request context.
 * @param headers
 */
function processRequest(context, headers) {

    logger.log('info', 'Processing request');

    const r = q.defer();
    const requestKey = headers.key;
    const requestObject = headers.objectRequest;
    mainRequestApi.apiRequestFormatter(context, requestKey, requestObject).then(function (results) {
        logger.log('debug', 'Processed request successfully with response: ' + JSON.stringify(results));
        r.resolve(results);
    });
    return r.promise;
}

/**
 * uploadToFirebase
 * @param {RequestContext} context The request context.
 * @param response
 * @desc Encrypt and upload the response to Firebase
 */
function uploadToFirebase(context, response) {
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

        listenerLegacyServer.encryptResponse(context, validResponse).then((response) => {

            response.Timestamp = admin.database.ServerValue.TIMESTAMP;
            let responsePath = 'users/' + requestKey;
            logger.log('debug', 'Firebase response branch: ' + responsePath);

            logger.log('debug', 'Response header**' + JSON.stringify(headers) + ' and requestKey  ' + requestKey);

            //delete responsePath;
             delete response.Headers.RequestObject;

            ref.child(responsePath).set(response).then(function () {
                logger.log('debug', 'Uploaded to firebase with response header' + JSON.stringify(response));
                completeRequest(headers, context.requestType);
                resolve('done');
            }).catch(function (error) {
                logger.log('error', 'Error writing to firebase', error);
                reject(error);
            });
        }).catch((err) => {
            logger.log('error', 'Error encrypting response or writing to firebase', err);
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
