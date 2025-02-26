/**
 * @description Manages caching for the output of encryption key derivation functions (such as PBKDF2).
 *              This is done to limit the need to recompute the output, which is time-consuming.
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

class KeyDerivationCache {
    constructor() {
        this.cache = new Keyv({ namespace: 'keyDerivation' });
        this.cache.on('error', err => legacyLogger.log('error', 'Keyv cache error (key derivation cache)', err));
    }

    /**
     * @description Gets a derived key (generated from PBKDF2), either cached or newly generated.
     *              A cache is used because key derivation is time-consuming.
     *              Workflow:
     *                1. On a cache miss, a new key is derived, cached, and used.
     *                2. On a cache hit, the derived key is tested for validity.
     *                  a. If the key is valid, it's used and kept in the cache.
     *                  b. If the key is invalid, it's removed from the cache. Then, a new key is generated,
     *                    cached, and used.
     *              The validity test and regeneration are done to prevent issues if a cached key becomes stale.
     * @param {string} secret Secret passed to the key derivation function.
     * @param {string} salt Salt passed to the key derivation function.
     * @param {string} [cacheLabel] The label (dictionary key) under which to get or store the derived key.
     *                              If not provided, then the cache is bypassed and a new key is derived.
     * @param {boolean} useLegacySettings [Temporary, compatibility] If true, the old settings for PBKDF2 are used.
     *                                    Used for compatibility with app version 1.12.2.
     * @param {Function} keyUsageFunction Callback function which is called after getting the key (with the
     *                                    key as a parameter).
     *                                    IMPORTANT: this function is used as a test of the cache success.
     *                                    If a cached value is used and this function fails, then the cached value
     *                                    is discarded, the key is re-derived, and the function is called again.
     *                                    Make sure this function can be called twice without any unwanted side effects.
     * @returns {Promise<void>} Resolves or rejects when the final keyUsageFunction is done executing.
     */
    async getKey(secret, salt, cacheLabel, useLegacySettings, keyUsageFunction) {
        // If no label is provided, bypass the cache
        if (!cacheLabel) {
            legacyLogger.log('debug', 'KeyDerivationCache cache not used for this request');
            const newValue = await this.#regenerateKey(undefined, secret, salt, useLegacySettings);
            keyUsageFunction(newValue);
            return;
        }

        // Get the value from the cache
        const cachedValue = await this.cache.get(cacheLabel);

        // Cache miss: generate the value and use it
        if (!cachedValue) {
            legacyLogger.log('debug', `KeyDerivationCache cache miss for ${cacheLabel}`);
            const newValue = await this.#regenerateKey(cacheLabel, secret, salt, useLegacySettings);
            keyUsageFunction(newValue);
            return;
        }

        // Cache hit: test the cached value for validity
        try {
            // If the keyUsageFunction succeeds using the cached value, there's nothing more to do
            legacyLogger.log('debug', `KeyDerivationCache cache hit for ${cacheLabel}`);
            keyUsageFunction(cachedValue);
        }
        catch (error) {
            // If the keyUsageFunction fails, the cached value is bad: invalidate it and try again
            legacyLogger.log('debug', `KeyDerivationCache cached value was bad; invalidating cache for ${cacheLabel}`);
            await this.#invalidate(cacheLabel);
            await this.getKey(secret, salt, cacheLabel, useLegacySettings, keyUsageFunction);
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
     * @description Clears out all content from the current cache.
     * @returns {Promise<void>} Resolves when the content has been cleared.
     */
    clear() {
        return this.cache.clear();
    }

    /**
     * @description Re-derives a key and saves it to the cache.
     * @param {string} [cacheLabel] The label under which the value is stored.
     *                              If no label is provided, then a new value is generated, but not stored in the cache.
     * @param {string} secret Secret passed to the key derivation function.
     * @param {string} salt Salt passed to the key derivation function.
     * @param {boolean} useLegacySettings [Temporary, compatibility] If true, the old settings for PBKDF2 are used.
     *                                    Used for compatibility with app version 1.12.2.
     * @returns {Promise<string>} Resolves to the newly generated PBKDF2 key.
     */
    async #regenerateKey(cacheLabel, secret, salt, useLegacySettings) {
        // Invalidate the previously cached value
        if (cacheLabel) await this.#invalidate(cacheLabel);

        // Temporary code for compatibility with app version 1.12.2
        const iterationsCompatibility = useLegacySettings ? legacyIterations : iterations;
        const keySizeBytesCompatibility = useLegacySettings ? legacyKeySizeBytes : keySizeBytes;
        const digestCompatibility = useLegacySettings ? legacyDigest : digest;

        // Generate the PBKDF2 key
        const outputBuffer = crypto.pbkdf2Sync(
            secret,
            salt,
            iterationsCompatibility,
            keySizeBytesCompatibility,
            digestCompatibility,
        );
        const output = outputBuffer.toString('hex');
        legacyLogger.log('debug', 'KeyDerivationCache generated a new key');

        // Store the output in the cache
        if (cacheLabel) await this.cache.set(cacheLabel, output);
        return output;
    }
}

// Singleton
module.exports = new KeyDerivationCache();
