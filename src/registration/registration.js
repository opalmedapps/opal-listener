const ApiRequest = require('../core/api-request');

class Registration {
    static async getEncryptionValues(snapshot) {
        const requestParams = {
            Parameters: {
                method: 'get',
                url: `/api/registration/by-hash/${snapshot.BranchName}`,
                headers: {
                    'Content-Type': 'application/json',
                },
            },
        };
        const response = await ApiRequest.makeRequest(requestParams);
        // TODO handle decryption using MRNs
        // https://o-hig.atlassian.net/browse/QSCCD-427
        return {
            salt: response.data.patient.ramq,
            secret: response.data.code,
        };
    }
}

module.exports = Registration;
