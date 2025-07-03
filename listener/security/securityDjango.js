// SPDX-FileCopyrightText: Copyright 2023 Opal Health Informatics Group at the Research Institute of the McGill University Health Centre <john.kildea@mcgill.ca>
//
// SPDX-License-Identifier: AGPL-3.0-or-later

/**
 * @file Makes and interprets API calls to the Django backend, to get information used in security-sensitive requests.
 */

import ApiRequest from '../../src/core/api-request.js';
import logger from '../logs/logger.js';

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
        logger.log('verbose', "API: Calling backend to get random security question and answer for the user");
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
        logger.log('verbose', "API: Calling backend to get all the active security questions");
        const response = await ApiRequest.makeRequest(requestParams);
        if (response?.data) return response.data;
        else {
            logger.log('error', 'Error from API call', response);
            throw new Error('Failed to get all the active security questions from the backend');
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
        logger.log('verbose', "API: Calling backend to get a list of security questions for the user");
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
        logger.log('verbose', "API: Calling backend to update security answers for the questions user provided");
    }
}

export default SecurityDjango;
