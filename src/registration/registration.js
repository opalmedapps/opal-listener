const ApiRequest = require('../core/api-request');

class Registration {
    static async getEncryptionValue(snapshot) {
        const requestParams = {
            UserID: 'registration',
            Parameters: {
                method: 'get',
                url: `/api/registration/by-hash/${snapshot.BranchName}`,
                headers: {
                    'Content-Type': 'application/json',
                },
            },
        };
        // const response = await ApiRequest.makeRequest(requestParams);
        // TODO return Registration encrytion value from django backend
        // https://o-hig.atlassian.net/browse/QSCCD-426
        return {
            salt: 'TESP62622718',
            secret: 'A0pt84n5hBzS',
        };
    }
}

module.exports = Registration;
