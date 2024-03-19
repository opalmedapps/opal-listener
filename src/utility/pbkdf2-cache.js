// Manages caching for the output of PBKDF2
// This is done to avoid having to recompute the result of PBKDF2 multiple times

const Keyv = require('keyv');
const crypto = require('crypto');
const legacyLogger = require('../../listener/logs/logger');

// Parameters for PBKDF2
const iterations = 25000;
const keySizeBytes = 32;
const digest = 'sha256';

// [Temporary compatibility with 1.12.2] Legacy parameters for PBKDF2
const legacyIterations = 1000;
const legacyKeySizeBytes = 16;
const legacyDigest = 'sha1';

class Pbkdf2Cache {
    constructor() {
        this.cache = new Keyv({ namespace: 'pbkdf2' });
        this.cache.on('error', err => legacyLogger.log('error', 'KeyV pbkdf2 data cache error', err));
    }

    /**
     * @param secret
     * @param salt
     * @param {boolean} useLegacySettings [Temporary, compatibility] If true, the old settings for PBKDF2 are used.
     *                                    Used for compatibility with app version 1.12.2.
     * @returns {string} The string key derived by PBKDF2.
     */
    getKey(secret, salt, useLegacySettings) {
        // Temporary code for compatibility with app version 1.12.2
        const iterationsCompatibility = useLegacySettings ? legacyIterations : iterations;
        const keySizeBytesCompatibility = useLegacySettings ? legacyKeySizeBytes : keySizeBytes;
        const digestCompatibility = useLegacySettings ? legacyDigest : digest;

        const derivedKey = crypto.pbkdf2Sync(
            secret,
            salt,
            iterationsCompatibility,
            keySizeBytesCompatibility,
            digestCompatibility,
        );
        return derivedKey.toString('hex');
    }
}

exports.Pbkdf2Cache = Pbkdf2Cache;
