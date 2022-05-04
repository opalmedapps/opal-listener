/**  Library Imports **/
const legacyListenerUtils = require('../../../listener/utility/utility');


/**
     resolveEmptyResponse
     @desc Returns empty response, function used by refresh, resume, login
     @param data
     @return {*}
 **/
exports.resolveEmptyResponse = legacyListenerUtils.resolveEmptyResponse;

/**
     toMYSQLString
     @desc Converts date object to mysql date
     @param date
     @return Date
 **/
exports.toMYSQLString = legacyListenerUtils.toMYSQLString;


/**
     unixToMYSQLTimestamp
     @desc Converts from milliseconds since 1970 to a mysql date
     @param time
     @return {Date}
 **/
exports.unixToMYSQLTimestamp = legacyListenerUtils.unixToMYSQLTimestamp;

/**
     generatePBKDFHash
     @desc generates encryption hash using PBKDF2 Hashing Algorithm
     @param secret
     @param salt
     @return {string}
 **/
exports.generatePBKDFHash = legacyListenerUtils.generatePBKDFHash;

/**
     encrypt
     @desc Encrypts a response object using PBKDF2 hash as key and NACL as encryption tool
     @param object
     @param secret
     @param salt
     @returns {Promise}
     @notes link for NACL encryption documentation: https://tweetnacl.js.org/#/
 **/
exports.encrypt = legacyListenerUtils.encrypt;

/**
     decrypt
     @desc Decrypts a request object so that it can be handled by the server
     @param object
     @param secret
     @param salt
     @returns {Promise}
     @notes link for NACL encryption documentation: https://tweetnacl.js.org/#/
 **/

exports.decrypt = legacyListenerUtils.decrypt;

//Encrypts an object, array, number, date or string
exports.encryptObject = legacyListenerUtils.encryptObject;

exports.hash = legacyListenerUtils.hash;

//Decryption function, returns an object whose values are all strings
exports.decryptObject = legacyListenerUtils.decryptObject;

exports.concatUTF8Array = legacyListenerUtils.concatUTF8Array;

//Create copy of object if no nested object
exports.copyObject = legacyListenerUtils.copyObject;
