const Keyv = require('keyv');
const ApiRequest = require('../core/api-request');
const legacyLogger = require('../../listener/logs/logger');
// TODO: Replace config.json with environment variable (DATA_CACHE_TIME_TO_LIVE_MINUTES) when QSCCD-207 is merged.
//       Sub: Add TTL var to env validation in environment.js (QSCCD-207 as well)
const config = require('../config/config.json');

const regCache = new Keyv({ namespace: 'registration' });
regCache.on('error', err => legacyLogger.log('error', err)); // default keyv error handling

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
        // Retrieve encryption values from memory if TTL has not been reached
        if (!await regCache.get('salt') && !await regCache.get('secret')) {
            legacyLogger.log('info', 'Registration encryption datacache TTL expired; fetching new data');
            const response = await ApiRequest.makeRequest(requestParams);
            await regCache.set('salt', response.data.patient.ramq, config.DATA_CACHE_TIME_TO_LIVE_MINUTES * 60 * 1000);
            await regCache.set('secret', response.data.code, config.DATA_CACHE_TIME_TO_LIVE_MINUTES * 60 * 1000);
        }
        else {
            legacyLogger.log('info', 'Loading registration encryption data from cache and resetting ttl');
            await regCache.set('salt', await regCache.get('salt'), config.DATA_CACHE_TIME_TO_LIVE_MINUTES * 60 * 1000);
            // eslint-disable-next-line max-len
            await regCache.set('secret', await regCache.get('secret'), config.DATA_CACHE_TIME_TO_LIVE_MINUTES * 60 * 1000);
        }
        // TODO handle decryption using MRNs
        // https://o-hig.atlassian.net/browse/QSCCD-427
        return {
            salt: await regCache.get('salt'), // .health_insurance_number
            secret: await regCache.get('secret'),
        };
    }
}

module.exports = Registration;
