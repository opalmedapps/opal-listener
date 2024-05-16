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
     *                1. On a cache miss, a new key is derived, cached, and returned.
     *                2. On a cache hit, the key is returned and kept in the cache.
     *              Cached keys should be removed from the cache using invalidate() before they become stale.
     * @param {string} secret Secret passed to the key derivation function.
     * @param {string} salt Salt passed to the key derivation function.
     * @param {string} [cacheLabel] The label (dictionary key) under which to get or store the derived key.
     *                              If not provided, then the cache is bypassed and a new key is derived.
     * @param {boolean} useLegacySettings [Temporary, compatibility] If true, the old settings for PBKDF2 are used.
     *                                    Used for compatibility with app version 1.12.2.
     * @returns {Promise<string>} Resolves to the derived key.
     */
    async getKey(secret, salt, cacheLabel, useLegacySettings) {
        // If no label is provided, bypass the cache
        if (!cacheLabel) {
            legacyLogger.log('debug', 'KeyDerivationCache cache not used for this request');
            return KeyDerivationCache.#generateKey(undefined, secret, salt, useLegacySettings);
        }

        // Get the value from the cache
        const cachedValue = await this.cache.get(cacheLabel);

        // Cache miss: generate the value and use it
        if (!cachedValue) {
            legacyLogger.log('debug', `KeyDerivationCache cache miss for ${cacheLabel}`);
            const key = KeyDerivationCache.#generateKey(cacheLabel, secret, salt, useLegacySettings);
            await this.#cacheKey(cacheLabel, key);
            return key;
        }

        // Cache hit: return the cached value and keep it in the cache
        legacyLogger.log('debug', `KeyDerivationCache cache hit for ${cacheLabel}`);
        return cachedValue;
    }

    /**
     * @description Invalidates a value from the cache (deletes it).
     * @param {string} cacheLabel The label under which the value is stored.
     * @returns {Promise<boolean>} Resolves to the result of Keyv's delete function.
     */
    invalidate(cacheLabel) {
        legacyLogger.log('debug', `KeyDerivationCache invalidated ${cacheLabel}`);
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
     * @description Stores a derived key in the cache.
     * @param {string} cacheLabel The label under which the value is stored.
     * @param {string} key The derived key to store.
     * @returns {Promise<true>} Resolves to the result of Keyv's set function.
     */
    #cacheKey(cacheLabel, key) {
        legacyLogger.log('debug', `KeyDerivationCache stored key for ${cacheLabel}`);
        return this.cache.set(cacheLabel, key);
    }

    /**
     * @description Derives a key and saves it to the cache.
     * @param {string} [cacheLabel] The label under which the value is stored.
     *                              If no label is provided, then a new value is generated, but not stored in the cache.
     * @param {string} secret Secret passed to the key derivation function.
     * @param {string} salt Salt passed to the key derivation function.
     * @param {boolean} useLegacySettings [Temporary, compatibility] If true, the old settings for PBKDF2 are used.
     *                                    Used for compatibility with app version 1.12.2.
     * @returns {string} The newly generated PBKDF2 key.
     */
    static #generateKey(cacheLabel, secret, salt, useLegacySettings) {
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

        legacyLogger.log('debug', 'KeyDerivationCache generated a new key');
        return outputBuffer.toString('hex');
    }
}

// Singleton
module.exports = new KeyDerivationCache();
