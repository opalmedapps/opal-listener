const Keyv = require('keyv');
const ApiRequest = require('../core/api-request');
const legacyLogger = require('../../listener/logs/logger');
// TODO: Replace config.json with environment variable (DATA_CACHE_TIME_TO_LIVE_MINUTES) when QSCCD-207 is merged.
const config = require('../config/config.json');

const regCache = new Keyv({ namespace: 'registration' });
regCache.on('error', err => legacyLogger.log('error', err)); // default keyv error handling

class Registration {
    static async getEncryptionValues(snapshot) {
        console.log(snapshot);
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
            legacyLogger.log('info', 'DATACACHE TTL EXPIRED, FETCHING NEW DATA');
            const response = await ApiRequest.makeRequest(requestParams);
            await regCache.set('salt', response.data.patient.ramq, config.DATA_CACHE_TIME_TO_LIVE_MINUTES * 60 * 1000);
            await regCache.set('secret', response.data.code, config.DATA_CACHE_TIME_TO_LIVE_MINUTES * 60 * 1000);
        } // TODO: Reset clock on lookup
        else {
            legacyLogger.log('info', 'LOADING DATA FROM CACHE');
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
