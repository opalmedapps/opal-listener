const cryptoJs = require('crypto-js');
const mysql = require('mysql');
const legacyOpalSqlRunner = require('../../listener/sql/opal-sql-query-runner');
const legacyLogger = require('../../listener/logs/logger');
const legacyUtility = require('../../listener/utility/utility');

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
     * @description Hash input string to use for request encryption.
     * @param {string} input to be encrypt.
     * @returns {string} Encrypted string.
     */
    static hash(input) {
        return cryptoJs.SHA512(input).toString();
    }

    /**
     * @description Get secret value which is either an hash of the username or registration token for registration.
     * @param {object} snapshot Firebase snapshot value
     * @returns {string} Value of the secret string use for encryption and decryption
     */
    static async getSecret(snapshot) {
        return EncryptionUtilities.hash(snapshot.UserID);
    }

    /**
     * @description Get salt which is either security answer text for api calls or RAMQ for registration.
     * @param {object} snapshot Firebase snapshot value
     * @returns {string} salt value for decryption
     */
    static async getSalt(snapshot) {
        return EncryptionUtilities.getAnswerText(snapshot.UserID);
    }

    /**
     * @description SQL query to get security question hash used for encryption and decryption
     * @param {string} userId ID used to retrive salt.
     * @returns {string} Security question hash.
     */
    static async getAnswerText(userId) {
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
            ORDER BY PDI.LastUpdated DESC
            LIMIT 1
        `, [userId]);

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
