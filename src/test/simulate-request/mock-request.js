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
 * Registration sample request
 */
const registrationRequest = {
    Request: 'registration-api',
    BranchName: 'A0pt84n5hBzS',
    Parameters: {
        method: 'get',
        url: '/api/registration',
        data: {
            ipAddress: '192.168.32.1',
            ramq: 'TESP62622718',
        },
    },
    Timestamp: '',
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
    registrationRequest,
    requestData,
    requestDataApi,
};
