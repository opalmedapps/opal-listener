const ApiRequest = require('../core/api-request');
const EncryptionUtilities = require('../encryption/encryption');

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
            salt: response.data.hospital_patients.map(entry => entry.mrn).concat([response.data.patient.ramq]),
            secret: response.data.code,
        };
    }

    /**
     * @description Decrypts a registration request in one of two ways: using one salt, or an array of possible salts.
     *              If an array of salts is provided, the one that ends in a successful decryption is saved,
     *              overwriting the array of salts provided in encryptionInfo.
     * @param {object} requestObject The Request object received from Firebase.
     * @param {{salt: string|string[], secret: string}} encryptionInfo The secret and salt(s) to use in decryption.
     * @returns {Promise<object>} Resolves to the decrypted result.
     */
    static async decryptOneOrManySalts(requestObject, encryptionInfo) {
        let decryptedRequest;
        if (Array.isArray(encryptionInfo.salt)) {
            const { result, salt } = await EncryptionUtilities.decryptRequestMultipleSalts(
                requestObject,
                encryptionInfo.secret,
                encryptionInfo.salt, // In this case, there are many possible salts (array)
            );
            decryptedRequest = result;
            // Save the salt that successfully decrypted the request (to be used to encrypt the response)
            // eslint-disable-next-line no-param-reassign
            encryptionInfo.salt = salt;
        }
        else {
            decryptedRequest = await EncryptionUtilities.decryptRequest(
                requestObject,
                encryptionInfo.secret,
                encryptionInfo.salt,
            );
        }
        return decryptedRequest;
    }
}

module.exports = Registration;
