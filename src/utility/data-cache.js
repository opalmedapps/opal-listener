/**
 * @file DataCache class used to store backend api-retrieved data in memory for some default TTL length of time.
 * @author Kelly Agnew
 */

// TODO: Replace config.json with environment variables when QSCCD-207 is merged.
const config = require('../config/config.json');
const legacyLogger = require('../../listener/logs/logger');

class DataCache {
    constructor(callingFunction, timeToLive = config.DATA_CACHE_TIME_TO_LIVE_MINUTES * 60 * 1000) {
        this.callingFunction = callingFunction;
        this.timeToLive = timeToLive;
        this.cache = null;
        this.getDate = new Date(0);
        this.fetchData = this.fetchData.bind(this);
        this.resetCache = this.resetCache.bind(this);
        this.isCacheExpired = this.isCacheExpired.bind(this);
    }

    /**
     * @description Check if time-to-live for data cache has been exceeded.
     * @returns {boolean} time-to-live expired
     */
    isCacheExpired() {
        return (this.getDate.getTime() + this.timeToLive) < new Date().getTime();
    }

    /**
     * @description Return data from in cache-memory if time-to-live hasn't been reached on current cache.
     * @returns {Promise} requested api data
     */
    fetchData() {
        if (!this.cache || this.isCacheExpired()) {
            legacyLogger.log('info', 'CACHE EXPIRED FETCHING NEW DATA');
            return this.callingFunction()
                .then(data => {
                    this.cache = data;
                    this.getDate = new DataCache();
                    return data;
                });
        }
        legacyLogger.log('info', 'LOAD DATA FROM CACHE');
        return Promise.resolve(this.cache);
    }

    /**
     * @description Reset the cache timer to 0.
     */
    resetCache() {
        this.getDate = new Date(0);
    }
}

module.exports = DataCache;
