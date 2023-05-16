const mysql = require("mysql");
const logger = require('./../logs/logger');

class SQLQueryRunner {
	#SQL_QUERY_POOL;
	#DB_CREDENTIALS;

	constructor(databaseCredentials={}) {
		this.#DB_CREDENTIALS = databaseCredentials;
		this.#SQL_QUERY_POOL = mysql.createPool(databaseCredentials);
	}

	/**
	 * Performs sql query given parameters and a postProcessing function
	 * @param query Query to perform
	 * @param {Array<Object>} parameters Parameters for specified as array of objects, note mysql transforms
	 *                        them to a string
	 * @param {Function} postProcessor Post processing function
	 * @returns {Promise<any>} Returns a promise with the results from the query
	 */
	run(query, parameters = null, postProcessor = null) {
		let connectionErrorMsg = `Failed to connect to database ${this.#DB_CREDENTIALS.database}`;

		return new Promise((resolve, reject) => {
			this.#SQL_QUERY_POOL.getConnection(function (err, connection) {
				logger.log('debug', `Grabbed SQL connection: ${connection}, `
					+ `with SSL ${process.env.USE_SSL === '1' ? 'enabled': 'disabled'}`);
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
module.exports = SQLQueryRunner;
