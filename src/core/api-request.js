/**
 * @file TO DO Make request to specified Django API routes
 * @author David Gagne
 */

const legacyLogger = require('../../listener/logs/logger');

class ApiRequest {
    // eslint-disable-next-line no-useless-constructor
    constructor() {
        // TO DO
        // Setup api connection using .env file
    }

    static makeRequest() {
        // TO DO
        // Make request to django API
        legacyLogger.log('debug', 'Sendig request to Opal API');
    }
}

module.exports = ApiRequest;
