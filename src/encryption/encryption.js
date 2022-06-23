const cryptoJs = require('crypto-js');
const mysql = require('mysql');
const legacyOpalSqlRunner = require('../../listener/sql/opal-sql-query-runner');
const legacyLogger = require('../../listener/logs/logger');
const legacyUtility = require('../../listener/utility/utility');
const { ErrorHandler } = require('../error/error-handler');

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
            throw new ErrorHandler(500, 'Ecryption error', error, null, false);
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
            throw new ErrorHandler(500, 'Error getting secret value', error, null, false);
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
     * @description SQL query to get security question hash used for encryption
     * @param {string} userId ID used to retrive salt.
     * @returns {string} Security question hash.
     */
    static async getSalt(userId) {
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
            throw new ErrorHandler(500, 'Error getting salt value', error, null, false);
        }
    }
}

exports.EncryptionUtilities = EncryptionUtilities;
