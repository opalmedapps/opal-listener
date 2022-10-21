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
    Token: CryptoJs.SHA512('randomString').toString(),
    UserID: 'JUYxJadQuhhOkC1TfrAqD4crhi73',
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
    Request: 'SecurityQuestionsList',
    BranchName: CryptoJs.SHA512('code12345678').toString(),
    Parameters: {
        Fields: 'OTES12345678',
    },
    Timestamp: '',
    SimulatedEncryption: {
        secret: 'code12345678',
        salt: 'OTES12345678',
    },
};

/**
 * Request representing legacy style
 */
const requestData = {
    AppVersion: '100.100.100',
    Request: 'DeviceIdentifier',
    DeviceId: '',
    Token: CryptoJs.SHA512('randomString').toString(),
    UserID: 'JUYxJadQuhhOkC1TfrAqD4crhi73',
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
