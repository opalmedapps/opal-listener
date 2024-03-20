/**
 * @description Manages caching for the output of PBKDF2.
 *              This is done to avoid having to recompute the result of PBKDF2 multiple times, which is time-consuming.
 * @author Stacey Beard, 2024-03-20
 */
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
        this.cache.on('error', err => legacyLogger.log('error', 'Keyv PBKDF2 data cache error', err));
    }

    /**
     * @description Gets a key generated from PBKDF2, either cached or newly generated.
     *              A cache is used because PBKDF2 is a time-consuming algorithm to run.
     *              Workflow:
     *                1. On a cache miss, the PBKDF2 value is generated, cached, and used.
     *                2. On a cache hit, the PBKDF2 value is tested for validity.
     *                  a. If the value is valid, it's used and kept in the cache.
     *                  b. If the value is invalid, it's removed from the cache. Then, a new value is generated,
     *                    cached, and used.
     *              The validity test and regeneration are done to prevent issues if a cached value becomes stale.
     * @param {string} secret Secret passed to PBKDF2.
     * @param {string} salt Salt passed to PBKDF2.
     * @param {boolean} useLegacySettings [Temporary, compatibility] If true, the old settings for PBKDF2 are used.
     *                                    Used for compatibility with app version 1.12.2.
     * @param {Function} keyUsageFunction Function which is called after getting the key value.
     *                                    IMPORTANT: this function is used as a test of the cache success.
     *                                    If a cached value is used and this function fails, then the cached value
     *                                    is discarded, the key is re-derived, and the function is called again.
     *                                    Make sure this function can be called twice without any unwanted side effects.
     * @returns {Promise<void>} Resolves or rejects when the final keyUsageFunction is done executing.
     */
    async getKey(secret, salt, useLegacySettings, keyUsageFunction) {
        // TODO set key based on user and device
        const cacheLabel = 'testing';

        // Get the value from the cache
        const cachedValue = await this.cache.get(cacheLabel);

        // Cache miss: generate the value and use it
        if (!cachedValue) {
            legacyLogger.log('debug', 'PBKDF2 cache miss');
            const newValue = await this.#regenerateKey(cacheLabel, secret, salt, useLegacySettings);
            keyUsageFunction(newValue);
            return;
        }

        // Cache hit: test the cached value for validity
        try {
            // If the keyUsageFunction succeeds using the cached value, there's nothing more to do
            legacyLogger.log('debug', 'PBKDF2 cache hit');
            keyUsageFunction(cachedValue);
        }
        catch (error) {
            // If the keyUsageFunction fails, the cached value is bad: invalidate it and try again
            legacyLogger.log('debug', 'PBKDF2 cached value was bad; invalidating');
            await this.#invalidate(cacheLabel);
            await this.getKey(secret, salt, useLegacySettings, keyUsageFunction);
        }
    }

    /**
     * @description Invalidates a value from the cache (deletes it).
     * @param {string} cacheLabel The label under which the value is stored.
     * @returns {Promise<boolean>} Resolves to the result of keyv's delete function.
     */
    #invalidate(cacheLabel) {
        return this.cache.delete(cacheLabel);
    }

    /**
     * @description Regenerates the output of PBKDF2 and saves it to the cache.
     * @param {string} cacheLabel The label under which the value is stored.
     * @param {string} secret Secret passed to PBKDF2.
     * @param {string} salt Salt passed to PBKDF2.
     * @param {boolean} useLegacySettings [Temporary, compatibility] If true, the old settings for PBKDF2 are used.
     *                                    Used for compatibility with app version 1.12.2.
     * @returns {Promise<string>} Resolves to the newly generated PBKDF2 key.
     */
    async #regenerateKey(cacheLabel, secret, salt, useLegacySettings) {
        // Invalidate the previously cached value
        await this.#invalidate(cacheLabel);

        // Temporary code for compatibility with app version 1.12.2
        const iterationsCompatibility = useLegacySettings ? legacyIterations : iterations;
        const keySizeBytesCompatibility = useLegacySettings ? legacyKeySizeBytes : keySizeBytes;
        const digestCompatibility = useLegacySettings ? legacyDigest : digest;

        // Generate the pbkdf2 key
        const outputBuffer = crypto.pbkdf2Sync(
            secret,
            salt,
            iterationsCompatibility,
            keySizeBytesCompatibility,
            digestCompatibility,
        );
        const output = outputBuffer.toString('hex');
        legacyLogger.log('debug', 'PBKDF2 generated a new key');

        // Store the output in the cache
        await this.cache.set(cacheLabel, output);
        return output;
    }
}

exports.Pbkdf2Cache = Pbkdf2Cache;
