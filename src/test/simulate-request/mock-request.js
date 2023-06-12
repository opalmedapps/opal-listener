/* eslint-disable no-unused-vars */
/**
 * @file unencrypted mock request
 * @author David Gagne
 */
const CryptoJs = require('crypto-js');

/**
 * Request for the new Django API
 */
const requestDataApi = {
    AppVersion: '100.100.100',
    Request: 'api',
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
    UserEmail: 'muhc.app.mobile@gmail.com',
};

/**
 * Registration request for the new Django API
 */
const requestRegistrationApi = {
    Request: 'registration-api',
    BranchName: CryptoJs.SHA512('code12345678').toString(),
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
        secret: 'code12345678',
        salt: 'OTES12345678',
    },
};

/**
 * Legacy registration request
 */
const requestRegistration = {
    RequestType: 'REGISTRATION_LEGACY',
    Request: 'RegisterPatient',
    BranchName: CryptoJs.SHA512('code12345678').toString(),
    Parameters: {
        Fields: {
            email: 'test@opalmedapps.ca',
            password: 'test',
            accessLevel: 3,
            accessLevelSign: 1,
            accountExists: 0,
            answer1: 'test',
            answer2: 'test',
            answer3: 'test',
            language: 'en',
            securityQuestion1: 1,
            securityQuestion2: 2,
            securityQuestion3: 3,
            securityQuestionText1: 'Question 1?',
            securityQuestionText2: 'Question 2?',
            securityQuestionText3: 'Question 3?',
            termsandAggreementSign: 1,
            registrationCode: 'code12345678',
            phone: 1,
            ramq: 'SIMM86600199',
        },
    },
    Timestamp: '',
    SimulatedEncryption: {
        secret: 'code12345678',
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
    UserEmail: 'muhc.app.mobile@gmail.com',
};

module.exports = {
    requestRegistration,
    requestRegistrationApi,
    requestData,
    requestDataApi,
};
