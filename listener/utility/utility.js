// SPDX-FileCopyrightText: Copyright 2015 Opal Health Informatics Group at the Research Institute of the McGill University Health Centre <john.kildea@mcgill.ca>
//
// SPDX-License-Identifier: AGPL-3.0-or-later

import CryptoJS from 'crypto-js';
import stablelibutf8 from '@stablelib/utf8';
import nacl from 'tweetnacl';
import stablelibbase64 from '@stablelib/base64';
import keyDerivationCache from '../../src/utility/key-derivation-cache.js';

/**
 * resolveEmptyResponse
 * @desc Returns empty response, function used by refresh, resume, login
 * @param data
 * @return {*}
 */
function resolveEmptyResponse(data) {
    var counter=0;
    for (var key in data) {
        if(data[key].length>0) {
            counter++;
            break;
        }
    }
    if(counter === 0) data = 'empty';
    return data;
}

/**
 * toMYSQLString
 * @desc Converts date object to mysql date
 * @param date
 * @return Date
 */
function toMYSQLString(date) {
    let month = date.getMonth();
    let day=date.getDate();
    let hours=date.getHours();
    let minutes=date.getMinutes();
    let seconds=date.getSeconds();

    month++;

    if(hours<10) hours='0'+hours;
    if(minutes<10) minutes='0'+minutes;
    if(seconds<10) seconds='0'+seconds;
    if (day<10) day='0'+day;
    if (month<10) month='0'+month;

    return date.getFullYear()+'-'+month+'-'+day+' '+hours+':'+minutes+':'+seconds;
}

/**
 * @description Encrypts a response object.
 * @param {RequestContext} context The request context.
 * @param {Object} object The object to encrypt.
 * @param {string} secret If a salt is provided, the secret is used as a "password" with the salt to derive a key.
 *                        If no salt is provided, the secret is used directly as the encryption key.
 * @param {string} [salt] Optional salt; if provided, it's used with the secret to derive an encryption key.
 * @returns {Promise<Object>} Resolves to the encrypted object.
 */
async function encrypt(context, object, secret, salt) {
    const key = salt
        ? await keyDerivationCache.getKey(secret, salt, context.cacheLabel, context.useLegacyPBKDF2Settings)
        : secret;
    const truncatedKey = stablelibutf8.encode(key.substring(0, nacl.secretbox.keyLength));
    const nonce = nacl.randomBytes(nacl.secretbox.nonceLength);
    return encryptObject(object, truncatedKey, nonce);
}

/**
 * @description Decrypts a request object.
 * @param {RequestContext} context The request context.
 * @param {Object} object The object to decrypt.
 * @param {string} secret If a salt is provided, the secret is used as a "password" with the salt to derive a key.
 *                        If no salt is provided, the secret is used directly as the encryption key.
 * @param {string} [salt] Optional salt; if provided, it's used with the secret to derive an encryption key.
 * @returns {Promise<Object>} Resolves to the decrypted object.
 */
async function decrypt(context, object, secret, salt) {
    const key = salt
        ? await keyDerivationCache.getKey(secret, salt, context.cacheLabel, context.useLegacyPBKDF2Settings)
        : secret;
    const truncatedKey = stablelibutf8.encode(key.substring(0, nacl.secretbox.keyLength));
    return decryptObject(object, truncatedKey);
}

//Encrypts an object, array, number, date or string
function encryptObject(object, secret, nonce) {
    if(typeof object === 'string')
    {
        object = stablelibbase64.encode(concatUTF8Array(nonce, nacl.secretbox(stablelibutf8.encode(object),nonce,secret)));
        return object;
    }else{
        for (let key in object) {

            // Don't encrypt the response code
            if (key === 'Code') continue;

            if (typeof object[key] === 'object')
            {

                if(object[key] instanceof Date )
                {
                    object[key]=object[key].toISOString();
                    object[key] = stablelibbase64.encode(concatUTF8Array(nonce, nacl.secretbox(stablelibutf8.encode(object[key]),nonce,secret)));

                }else{
                    encryptObject(object[key],secret,nonce);
                }

            } else
            {
                if (typeof object[key] !=='string') {
                    object[key]=String(object[key]);
                }
                object[key] = stablelibbase64.encode(concatUTF8Array(nonce,nacl.secretbox(stablelibutf8.encode(object[key]),nonce,secret)));
            }
        }
        return object;
    }
}

function hash(input) {
    return CryptoJS.SHA512(input).toString();
    // return CryptoJS.SHA256(input).toString();
}

//Decryption function, returns an object whose values are all strings
function decryptObject(object, secret) {
    if(typeof object ==='string')
    {
        let enc = splitNonce(object);
        let object = stablelibutf8.decode(nacl.secretbox.open(enc[1],enc[0],secret));
        if(object === null) throw new Error('Encryption failed');

    }else{
        for (let key in object)
        {
            if (typeof object[key]==='object')
            {
                decryptObject(object[key],secret);
            }else {
                let enc = splitNonce(object[key]);
                let dec = stablelibutf8.decode(nacl.secretbox.open(enc[1], enc[0], secret));
                if(dec === null) throw new Error('Encryption failed');
                object[key] = dec;
            }
        }
    }
    return object;
}

function concatUTF8Array(a1, a2) {
    let c = new Uint8Array(a1.length + a2.length);
    c.set(new Uint8Array(a1),0);
    c.set(new Uint8Array(a2), a1.length);
    return c;
}

function splitNonce(str) {
    const ar = stablelibbase64.decode(str);
    return [ar.slice(0,nacl.secretbox.nonceLength),ar.slice(nacl.secretbox.nonceLength)];
}

//Create copy of object if no nested object
function copyObject(object) {
    const copy = {};
    for (const key in object) {
        copy[key] = object[key];
    }
    return copy;
}

/**
 * htmlspecialchars_decode
 * @desc this is a helper function used to decode html encoding
 * @param {string} string string to be decoded
 * @param quoteStyle
 * @returns {string} decoded string
 */
function htmlspecialchars_decode(string, quoteStyle) {
    var optTemp = 0;
    var i = 0;
    var noquotes = false;

    if (typeof quoteStyle === 'undefined') {
        quoteStyle = 2;
    }
    string = string.toString()
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>');
    var OPTS = {
        'ENT_NOQUOTES': 0,
        'ENT_HTML_QUOTE_SINGLE': 1,
        'ENT_HTML_QUOTE_DOUBLE': 2,
        'ENT_COMPAT': 2,
        'ENT_QUOTES': 3,
        'ENT_IGNORE': 4
    };

    if (quoteStyle === 0) {
        noquotes = true;
    }
    if (typeof quoteStyle !== 'number') {
        // Allow for a single string or an array of string flags
        quoteStyle = [].concat(quoteStyle);
        for (i = 0; i < quoteStyle.length; i++) {
            if (OPTS[quoteStyle[i]] === 0) {
                noquotes = true;
            } else if (OPTS[quoteStyle[i]]) {
                optTemp = optTemp | OPTS[quoteStyle[i]];
            }
        }
        quoteStyle = optTemp
    }
    if (quoteStyle & OPTS.ENT_HTML_QUOTE_SINGLE) {
        string = string.replace(/&#0*39;/g, "'");
    }
    if (!noquotes) {
        string = string.replace(/&quot;/g, '"');
    }

    return string.replace(/&amp;/g, '&');
}

/**
 * @description Stringifies an object, while truncating any string or array that's too long to improve readability.
 * @param {Object} object - The object to stringify.
 * @returns {string} A shortened stringified version of the object.
 */
function stringifyShort(object) {
    const charThreshold = 1000; // The number of characters past which to truncate a string value
    const arrayThreshold = 300; // The number of elements past which to truncate an array value
    const charsToLeave = 100; // The number of characters to leave when truncating a string value

    return JSON.stringify(object, (key, value) => {
        if (typeof value === "string" && value.length > charThreshold) {
            return value.substr(0, charsToLeave) + "...";
        }
        else if (Array.isArray(value) && value.length > arrayThreshold) {
            return "[Array]" // Arrays cannot be spliced in a stringify replacer function (see docs for details)
        }
        else return value;
    });
}

/**
 * @description Adds an item several times at the end of an array (returns a new copy of the array).
 * @param {Array} array - The array to which to add the item.
 * @param {*} item - The item to add.
 * @param {number} numTimes - The number of times to add the item.
 * @returns {Array} A copy of the original array, with the new items added.
 */
function addSeveralToArray(array, item, numTimes) {
    let arrCopy = [...array];
    for (let i = 0; i < numTimes; i++) arrCopy.push(item);
    return arrCopy;
}

export default {
    resolveEmptyResponse,
    toMYSQLString,
    encrypt,
    decrypt,
    encryptObject,
    hash,
    decryptObject,
    concatUTF8Array,
    copyObject,
    htmlspecialchars_decode,
    stringifyShort,
    addSeveralToArray,
}
