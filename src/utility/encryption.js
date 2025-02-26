const cryptoJs = require('crypto-js');
const mysql = require('mysql');
const legacyOpalSqlRunner = require('../../listener/sql/opal-sql-query-runner');
const legacyLogger = require('../../listener/logs/logger');
const legacyUtility = require('../../listener/utility/utility');

class EncryptionUtilities {
    /**
     * @description Encrypted request received from firebase.
     */
    #request;

    /**
     * @description Secret key for encrypting and decrypting data.
     */
    #secret;

    /**
     * @description Secret salt for encrypting and decrypting data.
     */
    #salt;

    constructor(request) {
        this.#request = request;
    }

    /**
     * @description Encrypt response data to be send to Firebase.
     * @param {object} response Unencrypted response.
     * @returns {object} Encrypted response
     */
    async encryptResponse(response) {
        legacyLogger.log('debug', 'API: Encrypting response');
        return legacyUtility.encrypt(
            response,
            this.#secret,
            this.#salt,
        );
    }

    /**
     * @description Decrypt request used for class instantiation.
     * @returns {object} Decrypted request.
     */
    async decryptRequest() {
        legacyLogger.log('debug', 'API: Decrypting request');
        this.#secret = this.#getSecret();
        this.#salt = await this.#getSalt();
        const decryptedRequest = await legacyUtility.decrypt(
            {
                req: this.#request.Request,
                params: this.#request.Parameters,
            },
            this.#secret,
            this.#salt,
        );

        return {
            ...this.#request,
            Request: decryptedRequest.req,
            Parameters: decryptedRequest.params,
        };
    }

    /**
     * @description Encrypt user id to use for request encryption.
     * @returns {string} Encrypted user ID.
     */
    #getSecret() {
        return cryptoJs.SHA512(this.#request.UserID).toString();
    }

    /**
     * @description SQL query to get security question hash used for encryption
     * @returns {string} Security question hash.
     */
    async #getSalt() {
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
        `, [this.#request.UserID]);

        const response = await legacyOpalSqlRunner.OpalSQLQueryRunner.run(query);
        return response[0].AnswerText;
    }
}

exports.EncryptionUtilities = EncryptionUtilities;
