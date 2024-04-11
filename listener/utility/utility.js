const CryptoJS          = require('crypto-js');
const stablelibutf8     = require('@stablelib/utf8');
const nacl              = require('tweetnacl');
const stablelibbase64   = require('@stablelib/base64');
const crypto            = require('crypto');
const Q                 = require('q');
const { Pbkdf2Cache }   = require('../../src/utility/pbkdf2-cache');

// Manages caching of PBKDF2 derived keys, to avoid the need to recompute a key every time a request is made by the same user
const pbkdf2Cache = new Pbkdf2Cache();

/**
 * resolveEmptyResponse
 * @desc Returns empty response, function used by refresh, resume, login
 * @param data
 * @return {*}
 */
exports.resolveEmptyResponse=function(data) {
    var counter=0;
    for (var key in data) {
        if(data[key].length>0) {
            counter++;
            break;
        }
    }
    if(counter === 0) data = 'empty';
    return data;
};

/**
 * toMYSQLString
 * @desc Converts date object to mysql date
 * @param date
 * @return Date
 */
exports.toMYSQLString=function(date) {
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
};


/**
 * unixToMYSQLTimestamp
 * @desc Converts from milliseconds since 1970 to a mysql date
 * @param time
 * @return {Date}
 */
exports.unixToMYSQLTimestamp=function(time) {
    const date = new Date(time);
    return exports.toMYSQLString(date);
};

/**
 * @description Encrypts a response object.
 * @param {Object} object The object to encrypt.
 * @param {string} secret If a salt is provided, this value is used as a "password" passed to PBKDF2 to derive a key.
 *                        If no salt is provided, this value is used directly as the encryption key.
 * @param {string} [salt] Optional salt; if provided, it's used with the secret for PBKDF2 to derive an encryption key.
 * @param {string} [cacheLabel] Required if a salt is provided. Used to look up or store a cached PBKDF2 value.
 * @param {boolean} useLegacySettings [Temporary, compatibility] If true, the old settings for PBKDF2 are used.
 *                                    Used for compatibility with app version 1.12.2.
 * @returns {Promise<Object>} Resolves to the encrypted object.
 */
exports.encrypt = function(object, secret, salt, cacheLabel, useLegacySettings = false) {
    return new Promise(async (resolve, reject) => {
        try {
            if (salt) await pbkdf2Cache.getKey(secret, salt, cacheLabel, useLegacySettings, continueWithKey);
            else continueWithKey(secret);

            // The second half of this function is itself wrapped in a function to work with the PBKDF2 cache above
            function continueWithKey(key) {
                const truncatedKey = stablelibutf8.encode(key.substring(0, nacl.secretbox.keyLength));
                const nonce = nacl.randomBytes(nacl.secretbox.nonceLength);
                resolve(exports.encryptObject(object, truncatedKey, nonce));
            }
        }
        catch (error) {
            reject(error);
        }
    });
};

/**
 * @description Decrypts a request object.
 * @param {Object} object The object to decrypt.
 * @param {string} secret If a salt is provided, this value is used as a "password" passed to PBKDF2 to derive a key.
 *                        If no salt is provided, this value is used directly as the decryption key.
 * @param {string} [salt] Optional salt; if provided, it's used with the secret for PBKDF2 to derive a decryption key.
 * @param {string} [cacheLabel] Required if a salt is provided. Used to look up or store a cached PBKDF2 value.
 * @param {boolean} useLegacySettings [Temporary, compatibility] If true, the old settings for PBKDF2 are used.
 *                                    Used for compatibility with app version 1.12.2.
 * @returns {Promise<Object>} Resolves to the decrypted object.
 */
exports.decrypt = function(object, secret, salt, cacheLabel, useLegacySettings = false) {
    return new Promise(async (resolve, reject) => {
        try {
            if (salt) await pbkdf2Cache.getKey(secret, salt, cacheLabel, useLegacySettings, continueWithKey);
            else continueWithKey(secret);

            // The second half of this function is itself wrapped in a function to work with the PBKDF2 cache above
            function continueWithKey(key) {
                const truncatedKey = stablelibutf8.encode(key.substring(0, nacl.secretbox.keyLength));
                resolve(exports.decryptObject(object, truncatedKey));
            }
        }
        catch (error) {
            reject(error);
        }
    });
};

//Encrypts an object, array, number, date or string
exports.encryptObject=function(object,secret,nonce)
{
    if(typeof object === 'string')
    {
        object = stablelibbase64.encode(exports.concatUTF8Array(nonce, nacl.secretbox(stablelibutf8.encode(object),nonce,secret)));
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
                    object[key] = stablelibbase64.encode(exports.concatUTF8Array(nonce, nacl.secretbox(stablelibutf8.encode(object[key]),nonce,secret)));

                }else{
                    exports.encryptObject(object[key],secret,nonce);
                }

            } else
            {
                if (typeof object[key] !=='string') {
                    object[key]=String(object[key]);
                }
                object[key] = stablelibbase64.encode(exports.concatUTF8Array(nonce,nacl.secretbox(stablelibutf8.encode(object[key]),nonce,secret)));
            }
        }
        return object;
    }

};

exports.hash=function(input) {
    return CryptoJS.SHA512(input).toString();
    // return CryptoJS.SHA256(input).toString();
};

//Decryption function, returns an object whose values are all strings
exports.decryptObject=function(object,secret)
{
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
                exports.decryptObject(object[key],secret);
            }else {
                let enc = splitNonce(object[key]);
                let dec = stablelibutf8.decode(nacl.secretbox.open(enc[1], enc[0], secret));
                if(dec === null) throw new Error('Encryption failed');
                object[key] = dec;
            }
        }
    }
    return object;
};

exports.concatUTF8Array = function(a1,a2)
{
    let c = new Uint8Array(a1.length + a2.length);
    c.set(new Uint8Array(a1),0);
    c.set(new Uint8Array(a2), a1.length);
    return c;
};

function splitNonce(str)
{
    const ar = stablelibbase64.decode(str);
    return [ar.slice(0,nacl.secretbox.nonceLength),ar.slice(nacl.secretbox.nonceLength)];
}

//Create copy of object if no nested object
exports.copyObject = function(object)
{
    const copy = {};
    for (const key in object) {
        copy[key] = object[key];
    }
    return copy;
};

/**
 * htmlspecialchars_decode
 * @desc this is a helper function used to decode html encoding
 * @param {string} string string to be decoded
 * @param quoteStyle
 * @returns {string} decoded string
 */
exports.htmlspecialchars_decode = function (string, quoteStyle) {
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
};

/**
 * @description Stringifies an object, while truncating any string or array that's too long to improve readability.
 * @param {Object} object - The object to stringify.
 * @returns {string} A shortened stringified version of the object.
 */
exports.stringifyShort = object => {
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
};

/**
 * @description Adds an item several times at the end of an array (returns a new copy of the array).
 * @param {Array} array - The array to which to add the item.
 * @param {*} item - The item to add.
 * @param {number} numTimes - The number of times to add the item.
 * @returns {Array} A copy of the original array, with the new items added.
 */
exports.addSeveralToArray = (array, item, numTimes) => {
    let arrCopy = [...array];
    for (let i = 0; i < numTimes; i++) arrCopy.push(item);
    return arrCopy;
};
