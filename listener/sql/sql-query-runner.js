// SPDX-FileCopyrightText: Copyright 2020 Opal Health Informatics Group at the Research Institute of the McGill University Health Centre <john.kildea@mcgill.ca>
//
// SPDX-License-Identifier: AGPL-3.0-or-later

import { ENVIRONMENT } from '../../src/environment.js';
import fs from 'fs';
import logger from '../logs/logger.js';
import mysql from 'mysql';

class SQLQueryRunner {
    #SQL_QUERY_POOL;
    #DB_CREDENTIALS;
    // List of allowed data types of the SQL query parameters (e.g., Object is prohibited)
    #ALLOWED_DATA_TYPES;

    /**
     * @desc Instantiates a database connection pool. Uses SSL if enabled.
     * @param databaseCredentials The database credentials to use, without any SSL params (these will be added here).
     */
    constructor(databaseCredentials = {}) {
        // Add SSL parameters if SSL is enabled
        this.#DB_CREDENTIALS = {
            ...databaseCredentials,
            ...(ENVIRONMENT.DATABASE_USE_SSL ? {
                ssl: {
                    ca: this.readSSLCAFile(),
                    rejectUnauthorized: true,
                }
            } : undefined
            ),
            stringifyObjects: true,
        };
        this.#SQL_QUERY_POOL = mysql.createPool(this.#DB_CREDENTIALS);
        this.#ALLOWED_DATA_TYPES = ['string', 'number', 'boolean', 'bigint', 'undefined'];
    }

    /**
     * @desc Reads the SSL CA file provided as a path in the .env file, under SSL_CA.
     * @returns {Buffer} The read file contents.
     */
    readSSLCAFile() {
        try {
            let filePath = ENVIRONMENT.SSL_CA;
            return fs.readFileSync(filePath);
        }
        catch (error) {
            logger.log('error', 'Failed to read SSL CA file. SSL is enabled via the DATABASE_USE_SSL environment variable. ' +
                'Check the path defined in .env as SSL_CA.', error);
            process.exit(1);
        }
    }

    /**
     * @desc Check if the object is a date type.
     * @returns {boolean} Boolean value indicating if the value's type is a date.
     */
    isValidDate(value) {
        // See: https://builtin.com/software-engineering-perspectives/javascript-array-typeof
        // See: https://stackoverflow.com/questions/643782/how-to-check-whether-an-object-is-a-date
        return value instanceof Date && !Number.isNaN(value.valueOf());
    }

    /**
     * Performs sql query given parameters and a postProcessing function
     * @param query Query to perform
     * @param {Array<any>} parameters an array of SQL query parameters
     * @param {Function} postProcessor Post processing function
     * @returns {Promise<any>} Returns a promise with the results from the query
     */
    run(query, parameters = null, postProcessor = null) {
        let dbName = this.#DB_CREDENTIALS.database;
        let connectionErrorMsg = `Failed to connect to database ${dbName}`;

        return new Promise((resolve, reject) => {
            // Reject value types that are different than those defined as allowed types
            if (parameters) {
                for (const value of parameters) {
                    let fieldType = typeof value;
                    if (
                        !this.#ALLOWED_DATA_TYPES.includes(fieldType)
                        // typeof for a datetime is object
                        && !this.isValidDate(value)
                        // typeof for an array is object
                        // allow arrows to support queries with the IN clause
                        && !Array.isArray(value)
                    ) {
                        logger.log('error', `The query's parameter has a prohibited type: ${fieldType}.`);
                        reject('An error occurred while processing the request.');
                        return;
                    }
                }
            }
            this.#SQL_QUERY_POOL.getConnection(function (err, connection) {
                logger.log('debug', `Grabbed SQL connection to ${dbName}: ${connection}, `
                    + `with SSL ${ENVIRONMENT.DATABASE_USE_SSL ? 'enabled' : 'disabled'}`);
                if (err) {
                    logger.log('error', `Failed to establish database connection`, err);
                    reject(connectionErrorMsg);
                    return;
                }
                else if (!connection) {
                    reject(connectionErrorMsg);
                    return;
                }

                const que = connection.query(query, parameters, function (err, rows) {
                    connection.release();
                    if (err) {
                        logger.log("error", `Failed to execute query: ${que.sql}`, err);
                        reject(err);
                    }
                    logger.log('info', `Successfully performed query: ${que.sql}`);
                    if (typeof rows !== 'undefined') {
                        if (postProcessor instanceof Function) postProcessor(rows).then(rows => resolve(rows));
                        else resolve(rows);
                    } else {
                        resolve([]);
                    }
                });
            });
        });
    };
}

export default SQLQueryRunner;
