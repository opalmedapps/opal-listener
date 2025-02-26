const cryptoJs = require('crypto-js');
const mysql = require('mysql');
const legacyOpalSqlRunner = require('../../listener/sql/opal-sql-query-runner');
const legacyLogger = require('../../listener/logs/logger');
const legacyUtility = require('../../listener/utility/utility');
const PromiseUtility = require('../utility/promise');
const { RequestContext } = require('../core/request-context');

class EncryptionUtilities {
    /**
     * @description Encrypt response data to be send to Firebase.
     * @param {RequestContext} context The request context.
     * @param {object} response Unencrypted response.
     * @param {string} secret Secret hash use for encryption
     * @param {string} salt Salt use for encryption
     * @returns {object} Encrypted response
     */
    static async encryptResponse(context, response, secret, salt) {
        legacyLogger.log('debug', 'API: Encrypting response');
        try {
            return legacyUtility.encrypt(context, response, secret, salt);
        }
        catch (error) {
            throw new Error('ENCRYPTION', { cause: error });
        }
    }

    /**
     * @description Decrypt request used for class instantiation.
     * @param {RequestContext} context The request context.
     * @param {object} request Encrypted request uploaded from Firebase to be decrypt
     * @param {string} secret Secret hash use for encryption
     * @param {string} salt Salt use for encryption
     * @returns {object} requestDecrypted request.
     */
    static async decryptRequest(context, request, secret, salt) {
        legacyLogger.log('debug', 'API: Decrypting request');
        try {
            const contentToDecrypt = {
                req: request.Request,
                params: request.Parameters,
            };
            const decrypted = await legacyUtility.decrypt(context, contentToDecrypt, secret, salt);

            return {
                ...request,
                Request: decrypted.req,
                Parameters: decrypted.params,
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
     * @param {RequestContext} context The request context.
     * @param {object} request The request to decrypt.
     * @param {string} secret The value to use as the encryption secret.
     * @param {string[]} saltArray An array of possible salt values to use to decrypt.
     * @returns {Promise<{result, salt}>} An object with the decrypted result and the correct salt used to decrypt.
     */
    static async decryptRequestMultipleSalts(context, request, secret, saltArray) {
        if (!Array.isArray(saltArray)) {
            throw new Error('DECRYPTION', {
                cause: "decryptRequestMultipleSalts can only be called with an Array as the 'saltArray' param",
            });
        }

        // While testing multiple salts, bypass the key derivation cache (to avoid caching incorrect keys)
        const { cacheLabel } = context;
        context.cacheLabel = undefined;

        const promises = saltArray.map(salt => this.decryptRequest(context, request, secret, salt));
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
                    individualErrors: aggregateErr.errors.map(e => `${e.message} ${e.cause} ${e.stack}`).join(' | '),
                },
            });
        }
        finally {
            // Restore the cacheLabel
            context.cacheLabel = cacheLabel;
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
     * @description Gets the encryption values for a standard app request.
     * @param {RequestContext} context The request context.
     * @returns {Promise<{salt: string, secret: string}>} Secret and salt values used for encryption.
     */
    static async getEncryptionInfo(context) {
        return {
            salt: await this.getSalt(context),
            secret: await this.getSecret(context),
        };
    }

    /**
     * @description Get secret value which an hash of the userID.
     * @param {RequestContext} context The request context.
     * @returns {Promise<string>} Resolves to the value of the secret used for encryption and decryption.
     */
    static async getSecret(context) {
        return this.hash(context.userId);
    }

    /**
     * @description Get salt which is the security answer related to the device making the request.
     * @param {RequestContext} context The request context.
     * @returns {Promise<string>} Resolves to the value of the salt used for encryption and decryption.
     */
    static async getSalt(context) {
        return this.getAnswerText(context.userId, context.deviceId);
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
                PDI.SecurityAnswer
            FROM
                PatientDeviceIdentifier PDI
            WHERE
                PDI.Username = ?
                AND PDI.DeviceId = ?
        `, [userId, deviceId]);

        try {
            const response = await legacyOpalSqlRunner.OpalSQLQueryRunner.run(query);
            return response[0].SecurityAnswer;
        }
        catch (error) {
            throw new Error('ENCRYPTION_SALT', { cause: error });
        }
    }
}

module.exports = EncryptionUtilities;
