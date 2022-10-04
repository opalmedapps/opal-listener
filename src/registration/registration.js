const Keyv = require('keyv');
const ApiRequest = require('../core/api-request');
const legacyLogger = require('../../listener/logs/logger');

const regCache = new Keyv({ namespace: 'registration' });
regCache.on('error', err => legacyLogger.log(
    'error',
    'KeyV registration data cache error',
    err,
));
class Registration {
    static async getEncryptionValues(snapshot) {
        // We bind the snapshot branch name to dedicated salt and secret keys for this regCache instance
        // This allows to keep a dedicated datacache for each unique registration code hash
        const instanceSalt = `salt-${snapshot.BranchName}`;
        const instanceSecret = `secret-${snapshot.BranchName}`;

        const requestParams = {
            Parameters: {
                method: 'get',
                url: `/api/registration/by-hash/${snapshot.BranchName}`,
                headers: {
                    'Content-Type': 'application/json',
                },
            },
        };
        // Retrieve encryption values from memory if TTL has not been reached
        if (!await regCache.get(instanceSalt) || !await regCache.get(instanceSecret)) {
            legacyLogger.log('info', 'Registration encryption datacache TTL expired; fetching new data');
            const response = await ApiRequest.makeRequest(requestParams);
            await regCache.set(
                instanceSalt,
                response.data.patient.ramq,
                process.env.DATA_CACHE_TIME_TO_LIVE_MINUTES * 60 * 1000,
            );
            await regCache.set(
                instanceSecret,
                response.data.code,
                process.env.DATA_CACHE_TIME_TO_LIVE_MINUTES * 60 * 1000,
            );
        }
        else {
            legacyLogger.log('info', 'Loading registration encryption data from cache and resetting ttl');
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
        }
        // TODO handle decryption using MRNs
        // https://o-hig.atlassian.net/browse/QSCCD-427
        return {
            salt: await regCache.get(instanceSalt),
            secret: await regCache.get(instanceSecret),
        };
    }
}

module.exports = Registration;
