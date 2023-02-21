const cryptoJs = require('crypto-js');
const mysql = require('mysql');
const legacyOpalSqlRunner = require('../../listener/sql/opal-sql-query-runner');
const legacyLogger = require('../../listener/logs/logger');
const legacyUtility = require('../../listener/utility/utility');
const PromiseUtility = require('../utility/promise');

class EncryptionUtilities {
    /**
     * @description Encrypt response data to be send to Firebase.
     * @param {object} response Unencrypted response.
     * @param {string} secret Secret hash use for encryption
     * @param {string} salt Salt use for encryption
     * @returns {object} Encrypted response
     */
    static async encryptResponse(response, secret, salt) {
        legacyLogger.log('debug', 'API: Encrypting response');
        try {
            return legacyUtility.encrypt(
                response,
                secret,
                salt,
            );
        }
        catch (error) {
            throw new Error('ENCRYPTION', { cause: error });
        }
    }

    /**
     * @description Decrypt request used for class instantiation.
     * @param {object} request Encrypted request uploaded from Firebase to be decrypt
     * @param {string} secret Secret hash use for encryption
     * @param {string} salt Salt use for encryption
     * @returns {object} requestDecrypted request.
     */
    static async decryptRequest(request, secret, salt) {
        legacyLogger.log('debug', 'API: Decrypting request');
        try {
            const decryptedRequest = await legacyUtility.decrypt(
                {
                    req: request.Request,
                    params: request.Parameters,
                },
                secret,
                salt,
            );

            return {
                ...request,
                Request: decryptedRequest.req,
                Parameters: decryptedRequest.params,
            };
        }
        catch (error) {
            throw new Error('DECRYPTION', { cause: error });
        }
    }

    /**
     * @description Decrypts a request by trying several possible candidates as the salt value.
     *              Returns both the decrypted result and the salt that succeeded in the decryption.
     *              Calls 'decryptRequest' to do the decryption work.
     * @param {object} request The request to decrypt.
     * @param {string} secret The value to use as the encryption secret.
     * @param {string[]} saltArray An array of possible salt values to use to decrypt.
     * @returns {Promise<{result, salt}>} An object with the decrypted result and the correct salt used to decrypt.
     */
    static async decryptRequestMultipleSalts(request, secret, saltArray) {
        if (!Array.isArray(saltArray)) {
            throw new Error('DECRYPTION', {
                cause: "decryptRequestMultipleSalts can only be called with an Array as the 'saltArray' param",
            });
        }

        const promises = saltArray.map(salt => this.decryptRequest(request, secret, salt));
        try {
            // Return the first of the promises to succeed
            const { value, index } = await PromiseUtility.promiseAnyWithIndex(promises);
            legacyLogger.log('debug', 'Found salt with which to decrypt request');
            return {
                result: value,
                salt: saltArray[index],
            };
        }
        catch (aggregateErr) {
            // If none of the promises succeed, decryption has failed
            throw new Error('DECRYPTION', {
                cause: {
                    message: 'Failed multi-decryption attempts with all possible salt values provided.',
                    individualErrors: aggregateErr.errors,
                },
            });
        }
    }

    /**
     * @description Hash input string to use for request encryption.
     * @param {string} input to be encrypt.
     * @returns {string} Encrypted string.
     */
    static hash(input) {
        return cryptoJs.SHA512(input).toString();
    }

    /**
     * @description Get secret value which an hash of the userID.
     * @param {object} snapshot Firebase snapshot value
     * @returns {string} Value of the secret string use for encryption and decryption
     */
    static async getSecret(snapshot) {
        return EncryptionUtilities.hash(snapshot.UserID);
    }

    /**
     * @description Get salt which is the security answer related to the device making the request.
     * @param {object} snapshot Firebase snapshot value
     * @returns {string} salt value for decryption
     */
    static async getSalt(snapshot) {
        return EncryptionUtilities.getAnswerText(snapshot.UserID, snapshot.DeviceId);
    }

    /**
     * @description SQL query to get security question hash used for encryption and decryption
     * @param {string} userId ID used to retrive salt.
     * @param {string} deviceId ID of the device use to make the request.
     * @returns {string} Security question hash.
     */
    static async getAnswerText(userId, deviceId) {
        const query = mysql.format(`
            SELECT
                SA.AnswerText
            FROM
                Users U,
                PatientDeviceIdentifier PDI,
                SecurityAnswer SA
            WHERE
                U.Username = ?
            AND
                U.UserTypeSerNum = PDI.PatientSerNum
            AND
                PDI.SecurityAnswerSerNum = SA.SecurityAnswerSerNum
            AND PDI.DeviceId = ?
            LIMIT 1
        `, [userId, deviceId]);

        try {
            const response = await legacyOpalSqlRunner.OpalSQLQueryRunner.run(query);
            return response[0].AnswerText;
        }
        catch (error) {
            throw new Error('ENCRYPTION_SALT', { cause: error });
        }
    }
}

module.exports = EncryptionUtilities;
