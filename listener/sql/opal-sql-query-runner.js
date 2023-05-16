const config = require('./../config-adaptor');
const fs = require('fs');
const logger = require('../logs/logger');
const SQLQueryRunner = require('./sql-query-runner');

/**
 * This class serves as a static class to query OpalDB, currently since the `sqlInterface.runSqlQuery` is pervasive
 * through the whole application we use this to simulate that behaviour while decoupling the sqlInterface file slightly
 */
class OpalSQLQueryRunner {
	/******************************
	 * CONFIGURATIONS
	 ******************************/
	static #OPAL_DB_CREDENTIALS = {
		connectionLimit: 10,
		host: config.MYSQL_DATABASE_HOST,
		user: config.MYSQL_USERNAME,
		password: config.MYSQL_PASSWORD,
		database: config.MYSQL_DATABASE,
		dateStrings: true,
		port: config.MYSQL_DATABASE_PORT,
		...(process.env.USE_SSL === '1' ? {
				ssl: {
					ca: this.readSSLCAFile(),
				}
			} : undefined
		),
	};
	static opalQueryInstance = new SQLQueryRunner(this.#OPAL_DB_CREDENTIALS);

	constructor() {
		throw new Error("This class cannot be instantiated, use static method: run()");
	}

	static run = (...args) => OpalSQLQueryRunner.opalQueryInstance.run(...args);

	/**
	 * @desc Reads the SSL CA file provided as a path in the .env file.
	 * @returns {Buffer} The read file contents.
	 */
	static readSSLCAFile() {
		try {
			let filePath = process.env.SSL_CA;
			return fs.readFileSync(filePath);
		}
		catch(error) {
			logger.log('error', 'Failed to read SSL CA file. SSL is enabled via the USE_SSL environment variable. ' +
				'Check the path defined in .env under SSL_CA.', error);
			process.exit(1);
		}
	}
}

module.exports = {OpalSQLQueryRunner};
