const Keyv = require('keyv');
const ApiRequest = require('../core/api-request');
const EncryptionUtilities = require('../encryption/encryption');
const legacyLogger = require('../../listener/logs/logger');

const regCache = new Keyv({ namespace: 'registration' });
regCache.on('error', err => legacyLogger.log(
    'error',
    'KeyV registration data cache error',
    err,
));

// We bind the snapshot branch name to dedicated salt and secret keys for this regCache instance
// This allows to keep a dedicated datacache for each unique registration code hash
const getInstanceSalt = snapshot => `salt-${snapshot.BranchName}`;
const getInstanceSecret = snapshot => `secret-${snapshot.BranchName}`;

class Registration {
    static async getEncryptionValues(snapshot) {
        const requestParams = {
            Parameters: {
                method: 'get',
                url: `/api/registration/by-hash/${snapshot.BranchName}`,
                headers: {
                    'Content-Type': 'application/json',
                },
            },
        };
        const instanceSalt = getInstanceSalt(snapshot);
        const instanceSecret = getInstanceSecret(snapshot);

        // On cache miss, call the API to get encryption info
        if (!await regCache.get(instanceSalt) || !await regCache.get(instanceSecret)) {
            legacyLogger.log('info', 'Registration encryption data cache miss or TTL expired; fetching new data');
            const response = await ApiRequest.makeRequest(requestParams);
            return this.secretAndSaltFromResponse(response);
        }

        // Otherwise, on cache hit, retrieve encryption values from memory
        legacyLogger.log('info', 'Loading registration encryption data from cache and resetting TTL');
        await regCache.set(
            instanceSalt,
            await regCache.get(instanceSalt),
            process.env.DATA_CACHE_TIME_TO_LIVE_MINUTES * 60 * 1000,
        );
        await regCache.set(
            instanceSecret,
            await regCache.get(instanceSecret),
            process.env.DATA_CACHE_TIME_TO_LIVE_MINUTES * 60 * 1000,
        );
        return {
            salt: await regCache.get(instanceSalt),
            secret: await regCache.get(instanceSecret),
        };
    }

    /**
     * @description Used with getEncryptionValues() to extract salt and secret information from its API response.
     * @param {object} response The API response received by getEncryptionValues().
     * @throws {Error} 'ENCRYPTION_SALT' or 'ENCRYPTION_SECRET' error if either value is missing.
     * @returns {{salt: string|string[], secret: string}} An object containing a salt array and secret.
     */
    static secretAndSaltFromResponse(response) {
        // Extract the secret (registration code)
        const secret = response?.data?.code || undefined;

        // Extract the salt array (RAMQ and MRNs, excluding inactive MRNs)
        const hospitalPatients = response?.data?.hospital_patients || [];
        const salt = hospitalPatients.flatMap(entry => {
            return entry.mrn && entry.is_active ? [entry.mrn] : [];
        });
        if (response?.data?.patient?.ramq) salt.push(response.data.patient.ramq);

        if (salt.length === 0) throw new Error('ENCRYPTION_SALT', { cause: response?.data });
        if (!secret) throw new Error('ENCRYPTION_SECRET', { cause: response?.data });

        return { secret, salt };
    }

    /**
     * @description Decrypts a registration request in one of two ways: using one salt, or an array of possible salts.
     *              If an array of salts is provided, the one that ends in a successful decryption is saved,
     *              overwriting the array of salts provided in encryptionInfo.
     * @param {object} requestObject The Request object received from Firebase.
     * @param {{salt: string|string[], secret: string}} encryptionInfo The secret and salt(s) to use in decryption.
     * @returns {Promise<object>} Resolves to the decrypted result.
     */
    static async decryptOneOrManySalts(requestObject, encryptionInfo) {
        let decryptedRequest;
        if (Array.isArray(encryptionInfo.salt)) {
            const { result, salt } = await EncryptionUtilities.decryptRequestMultipleSalts(
                requestObject,
                encryptionInfo.secret,
                encryptionInfo.salt, // In this case, there are many possible salts (array)
            );
            decryptedRequest = result;
            // Save the salt that successfully decrypted the request (to be used to encrypt the response)
            // eslint-disable-next-line no-param-reassign
            encryptionInfo.salt = salt;
        }
        else {
            decryptedRequest = await EncryptionUtilities.decryptRequest(
                requestObject,
                encryptionInfo.secret,
                encryptionInfo.salt,
            );
        }
        // Cache encryption info for the first time (once we know which salt was successful) or reset TTL
        legacyLogger.log('info', 'Caching registration encryption data or resetting TTL');
        await regCache.set(
            getInstanceSalt(requestObject),
            encryptionInfo.salt,
            process.env.DATA_CACHE_TIME_TO_LIVE_MINUTES * 60 * 1000,
        );
        await regCache.set(
            getInstanceSecret(requestObject),
            encryptionInfo.secret,
            process.env.DATA_CACHE_TIME_TO_LIVE_MINUTES * 60 * 1000,
        );

        return decryptedRequest;
    }
}

module.exports = Registration;
