/**
 * @file Makes and interprets API calls to the Django backend, to get information used in security-sensitive requests.
 * @author Stacey Beard
 */

const ApiRequest = require('../../src/core/api-request');
const logger = require('../logs/logger');

class SecurityDjango {
    /**
     * @desc Calls the backend to get a random security question and answer for the current user.
     * @param {string} userId The Firebase username of the user making the request.
     * @returns {Promise<any>} Resolves to a random security question and answer for the current user.
     */
    static async getRandomSecurityQuestionAnswer(userId) {
        if (!userId) throw new Error('Cannot call API; no userId value provided');
        const requestParams = {
            Parameters: {
                method: 'get',
                url: `/api/caregivers/${userId}/security-questions/random/`,
                headers: {
                    'Content-Type': 'application/json',
                },
            },
        };
        logger.log('info', "API: Calling backend to get random security question and answer for the user");
        const response = await ApiRequest.makeRequest(requestParams);
        if (response?.data) return response.data;
        else {
            logger.log('error', 'Error from API call', response);
            throw new Error('Failed to get random security question and answer from the backend');
        }
    }

    /**
     * @desc Calls the backend to get a list of security questions for the current user.
     * @param {string} userId The Firebase username of the user making the request.
     * @returns {Promise<any>} Resolves to a list of security questions for the current user.
     */
    static async getSecurityQuestionList(userId) {
        if (!userId) throw new Error('Cannot call API; no userId value provided');
        const requestParams = {
            Parameters: {
                method: 'get',
                url: `/api/caregivers/${userId}/security-questions/`,
                headers: {
                    'Content-Type': 'application/json',
                },
            },
        };
        logger.log('info', "API: Calling backend to get a list of security questions for the user");
        const response = await ApiRequest.makeRequest(requestParams);
        if (response?.data) return response.data;
        else {
            logger.log('error', 'Error from API call', response);
            throw new Error('Failed to get a list of security questions from the backend');
        }
    }

    /**
     * @desc Calls the backend to update security answers for the questions user provided.
     * @param {string} userId The Firebase username of the user making the request.
     * @param {array} questionAnswerArr an array containing objects with properties: questionId, question, answer
     */
    static async updateSecurityQuestionAndAnswerList(userId, questionAnswerArr) {
        if (!userId) throw new Error('Cannot call API; no userId value provided');
        questionAnswerArr.forEach(function(questionAnswerObj) {
            const requestParams = {
                Parameters: {
                    method: 'put',
                    url: `/api/caregivers/${userId}/security-questions/${questionAnswerObj.questionId}/`,
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    data: {
                        'question': questionAnswerObj.question,
                        'answer': questionAnswerObj.answer,
                    }
                },
            };
            ApiRequest.makeRequest(requestParams);
        });
        logger.log('info', "API: Calling backend to update security answers for the questions user provided");
    }
}

module.exports = SecurityDjango;
