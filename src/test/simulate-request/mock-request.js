// eslint-disable-next-line max-len
// SPDX-FileCopyrightText: Copyright 2022 Opal Health Informatics Group at the Research Institute of the McGill University Health Centre <john.kildea@mcgill.ca>
//
// SPDX-License-Identifier: AGPL-3.0-or-later

/* eslint-disable no-unused-vars */
/**
 * @file unencrypted mock request
 */
const CryptoJs = require('crypto-js');

/**
 * Request for the new Django API
 */
const requestDataApi = {
    AppVersion: '100.100.100',
    Request: 'api',
    RequestType: 'API',
    DeviceId: '',
    UserID: process.env.TEST_ACCOUNT_FIREBASE_UID,
    Parameters: {
        method: 'get',
        url: '/api/app/home',
        headers: {
            'Content-Type': 'application/json',
            'Accept-Language': 'fr',
        },
    },
    Timestamp: '',
    UserEmail: 'marge@opalmedapps.ca',
};

/**
 * Registration request for the new Django API
 */
const requestRegistrationApi = {
    Request: 'registration-api',
    RequestType: 'REGISTRATION',
    BranchName: CryptoJs.SHA512('A0code123456').toString(),
    UserID: process.env.TEST_ACCOUNT_FIREBASE_UID,
    Parameters: {
        method: 'get',
        url: `/api/registration/by-hash/${CryptoJs.SHA512('code12345678')}`,
        headers: {
            'Content-Type': 'application/json',
            'Accept-Language': 'fr',
        },
    },
    Timestamp: '',
    SimulatedEncryption: {
        secret: 'A0code123456',
        salt: 'SIMM86600199',
    },
};

/**
 * Legacy registration request
 */
const requestRegistration = {
    RequestType: 'REGISTRATION_LEGACY',
    Request: 'RegisterPatient',
    BranchName: CryptoJs.SHA512('A0code123456').toString(),
    UserID: process.env.TEST_ACCOUNT_FIREBASE_UID,
    Parameters: {
        Fields: {
            accessLevel: '3',
            accessLevelSign: '1',
            accountExists: '0',
            answer1: 'test',
            answer2: 'test',
            answer3: 'test',
            email: 'test@opalmedapps.ca',
            language: 'en',
            mrn: '9999996',
            password: 'test-password',
            phone: '+11234567890',
            ramq: '',
            registrationCode: 'A0code123456',
            securityQuestion1: '1',
            securityQuestion2: '2',
            securityQuestion3: '3',
            securityQuestionText1: 'Question 1?',
            securityQuestionText2: 'Question 2?',
            securityQuestionText3: 'Question 3?',
            termsandAggreementSign: '1',
        },
    },
    Timestamp: '',
    SimulatedEncryption: {
        secret: 'A0code123456',
        salt: '9999996',
    },
};

/**
 * Request representing legacy style
 */
const requestData = {
    AppVersion: '100.100.100',
    RequestType: 'LEGACY',
    Request: 'DeviceIdentifier',
    DeviceId: '',
    UserID: process.env.TEST_ACCOUNT_FIREBASE_UID,
    Parameters: {
        deviceType: 'browser',
        registrationId: '',
    },
    Timestamp: '',
    UserEmail: 'marge@opalmedapps.ca',
};

module.exports = {
    requestRegistration,
    requestRegistrationApi,
    requestData,
    requestDataApi,
};
