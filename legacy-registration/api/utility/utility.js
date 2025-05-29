// SPDX-FileCopyrightText: Copyright 2020 Opal Health Informatics Group at the Research Institute of the McGill University Health Centre <john.kildea@mcgill.ca>
//
// SPDX-License-Identifier: AGPL-3.0-or-later

import legacyListenerUtils from '../../../listener/utility/utility.js';

/**
     resolveEmptyResponse
     @desc Returns empty response, function used by refresh, resume, login
     @param data
     @return {*}
 **/
const resolveEmptyResponse = legacyListenerUtils.resolveEmptyResponse;

/**
     toMYSQLString
     @desc Converts date object to mysql date
     @param date
     @return Date
 **/
const toMYSQLString = legacyListenerUtils.toMYSQLString;


/**
     unixToMYSQLTimestamp
     @desc Converts from milliseconds since 1970 to a mysql date
     @param time
     @return {Date}
 **/
const unixToMYSQLTimestamp = legacyListenerUtils.unixToMYSQLTimestamp;

/**
     encrypt
     @desc Encrypts a response object.
     @param object
     @param secret
     @param salt
     @returns {Promise}
     @notes link for NACL encryption documentation: https://tweetnacl.js.org/#/
 **/
const encrypt = legacyListenerUtils.encrypt;

/**
     decrypt
     @desc Decrypts a request object so that it can be handled by the server
     @param object
     @param secret
     @param salt
     @returns {Promise}
     @notes link for NACL encryption documentation: https://tweetnacl.js.org/#/
 **/

const decrypt = legacyListenerUtils.decrypt;

const hash = legacyListenerUtils.hash;

const concatUTF8Array = legacyListenerUtils.concatUTF8Array;

//Create copy of object if no nested object
const copyObject = legacyListenerUtils.copyObject;

export default {
    resolveEmptyResponse,
    toMYSQLString,
    unixToMYSQLTimestamp,
    encrypt,
    decrypt,
    hash,
    concatUTF8Array,
    copyObject,
}
