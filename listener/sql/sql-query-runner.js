const mysql = require("mysql");
const logger = require('./../logs/logger');
class SQLQueryRunner {
	#SQL_QUERY_POOL;
	#ALLOWED_DATA_TYPES =  ['string', 'number', 'boolean', 'bigint', 'undefined'];

	constructor(databaseCredentials={}) {
		const config = {
			...databaseCredentials,
			stringifyObjects: true,
		};
		this.#SQL_QUERY_POOL = mysql.createPool(config);
	}

	isValidDate(value) {
		// See: https://builtin.com/software-engineering-perspectives/javascript-array-typeof
		// See: https://stackoverflow.com/questions/643782/how-to-check-whether-an-object-is-a-date
		return value instanceof Date && !Number.isNaN(value.valueOf());
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
		return new Promise((resolve, reject) => {
			// Reject value types that are different than those defined as allowed types
			if (parameters) {
				parameters.forEach(parameter => {
					let fieldType = typeof parameter;
					// Check if the field's type is in the list of allowed types
					if (!this.#ALLOWED_DATA_TYPES.includes(fieldType) && !this.isValidDate(parameter)) {
						logger.log('error', `${parameter} field has ${fieldType} type which is not allowed.`);
						reject('An error occurred while processing the request.');
						return;
					}
				})
			}

			this.#SQL_QUERY_POOL.getConnection(function (err, connection) {
				logger.log('debug', `Grabbed SQL connection: ${connection}`);
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
