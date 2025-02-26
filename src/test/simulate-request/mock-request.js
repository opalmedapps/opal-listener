/* eslint-disable no-unused-vars */
/**
 * @file unencrypted mock request
 * @author David Gagne
 */
const CryptoJs = require('crypto-js');

/**
 * Request fir the new Django API
 */
const requestDataApi = {
    AppVersion: '100.100.100',
    Request: 'api',
    DeviceId: '',
    Token: CryptoJs.SHA512('randomString').toString(),
    UserID: 'JUYxJadQuhhOkC1TfrAqD4crhi73',
    Parameters: {
        method: 'get',
        url: 'http://host.docker.internal:8000/api/sites',
        headers: {
            Authorization: 'Token 7485eb68cc578e4b8a171af2849b63a7112e3b00',
            'Content-Type': 'application/json',
            'Accept-Language': 'fr',
        },
    },
    Timestamp: '',
    UserEmail: 'muhc.app.mobile@gmail.com',
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

module.exports = requestDataApi;
