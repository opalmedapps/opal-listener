const ApiRequest = require('../../src/core/api-request');
const logger = require('../logs/logger');

class QuestionnaireDjango {
    static async getCaregiverRelationships(userId) {
        const requestParams = {
            Parameters: {
                method: 'get',
                url: `/api/caregivers/patients/`,
                headers: {
                    'Content-Type': 'application/json',
                },
            },
            UserID: userId,
        };
        logger.log('info', "API: Calling backend to get the caregiver's list of relationships");
        const response = await ApiRequest.makeRequest(requestParams);
        return response;
    }
}

module.exports = QuestionnaireDjango;
