/**
 * @file TO DO Make request to specified Django API routes
 * @author David Gagne
 */

const Axios = require('axios');

const legacyLogger = require('../../listener/logs/logger');

class ApiRequest {
    static async makeRequest(validatedRequest) {
        legacyLogger.log('debug', 'Sending request to Opal API');
        try {
            const apiResponse = await Axios(validatedRequest.parameters);
            console.log('==>', apiResponse.data);
        }
        catch (error) {
            console.log('error ==>', error);
        }
    }
}

module.exports = ApiRequest;
