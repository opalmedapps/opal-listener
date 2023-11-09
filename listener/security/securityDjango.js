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
            UserID: userId,
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
     * @desc Calls the backend to get all the active security questions.
     * @param {string} userId The Firebase username of the user making the request.
     * @returns {Promise<any>} Resolves to get all the active security questions.
     */
    static async getActiveSecurityQuestions(userId) {
        const requestParams = {
            UserID: userId,
            Parameters: {
                method: 'get',
                url: `/api/security-questions/`,
                headers: {
                    'Content-Type': 'application/json',
                },
            },
        };
        logger.log('info', "API: Calling backend to get all the active security questions");
        const response = await ApiRequest.makeRequest(requestParams);
        if (response?.data) return response.data;
        else {
            logger.log('error', 'Error from API call', response);
            throw new Error('Failed to get all the active security questions from the backend');
        }
    }

    /**
     * @desc Calls the backend to get a specific active security question from SecurityQuestion model.
     * @param {string} userId The Firebase username of the user making the request.
     * @param {int} questionId The security question id.
     * @returns {Promise<any>} Resolves to a specific active security questions.
     */
    static async getSpecificActiveSecurityQuestion(userId, questionId) {
        if (!questionId) throw new Error('Cannot call API; no questionId value provided');
        const requestParams = {
            UserID: userId,
            Parameters: {
                method: 'get',
                url: `/api/security-questions/${questionId}/`,
                headers: {
                    'Content-Type': 'application/json',
                },
            },
        };
        logger.log('info', "API: Calling backend to get a specific active security question");
        const response = await ApiRequest.makeRequest(requestParams);
        if (response?.data) return response.data;
        else {
            logger.log('error', 'Error from API call', response);
            throw new Error('Failed to get a specific active security question from the backend');
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
            UserID: userId,
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
     * @desc Calls the backend to get a specific security question from SecurityAnswer model for the current user.
     * @param {string} userId The Firebase username of the user making the request.
     * @param {int} questionId The security question id.
     * @returns {Promise<any>} Resolves to a specific security questions for the current user.
     */
    static async getSpecificSecurityQuestion(userId, questionId) {
        if (!userId) throw new Error('Cannot call API; no userId value provided');
        if (!questionId) throw new Error('Cannot call API; no questionId value provided');
        const requestParams = {
            UserID: userId,
            Parameters: {
                method: 'get',
                url: `/api/caregivers/${userId}/security-questions/${questionId}/`,
                headers: {
                    'Content-Type': 'application/json',
                },
            },
        };
        logger.log('info', "API: Calling backend to get a specific security question for the user");
        const response = await ApiRequest.makeRequest(requestParams);
        if (response?.data) return response.data;
        else {
            logger.log('error', 'Error from API call', response);
            throw new Error('Failed to get a specific security question from the backend');
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
                UserID: userId,
                Parameters: {
                    method: 'put',
                    url: `/api/caregivers/${userId}/security-questions/${questionAnswerObj.questionId}/`,
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    data: {
                        'question': questionAnswerObj.question,
                        'answer': questionAnswerObj.answer,
                    },
                },
            };
            ApiRequest.makeRequest(requestParams);
        });
        logger.log('info', "API: Calling backend to update security answers for the questions user provided");
    }
}

module.exports = SecurityDjango;
