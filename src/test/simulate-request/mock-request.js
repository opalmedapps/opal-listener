/* eslint-disable max-len */
/**
 * @description unencripted mock request
 */

const CryptoJs = require('crypto-js');

const requestData = {
    AppVersion: '100.100.100',
    Request: 'DeviceIdentifier',
    DeviceId: '',
    Token: CryptoJs.SHA512('Opal12345!!').toString(),
    UserID: 'JUYxJadQuhhOkC1TfrAqD4crhi73',
    Parameters: {
        deviceType: 'browser',
        registrationId: '',
    },
    Timestamp: '',
    UserEmail: 'muhc.app.mobile@gmail.com',
};

module.exports = requestData;
