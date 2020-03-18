const mysql = require("mysql");
const logger = require('./../logs/logger');
const config = require('./../config.json');
class OpalSQLQuery{
	static #DB_CREDENTIALS = {
		connectionLimit: 10,
		host: config.HOST,
		user: config.MYSQL_USERNAME,
		password: config.MYSQL_PASSWORD,
		database: config.MYSQL_DATABASE,
		dateStrings: true,
		port: config.MYSQL_DATABASE_PORT
	};
	static #POOL = mysql.createPool(this.#DB_CREDENTIALS);

	/**
	 * Performs sql query given parameters and a postProcessing function
	 * @param query Query to perform
	 * @param {Array<Object>} parameters Parameters for specified as array of objects, note mysql transforms
	 *                        them to a string
	 * @param {Function} postProcessor Post processing function
	 * @returns {Promise<any>} Returns a promise with the results from the query
	 */
	static run(query, parameters=null, postProcessor=null) {
		return new Promise((resolve,reject)=>{
			this.#POOL.getConnection(function(err, connection) {
				logger.log('debug', `Grabbed SQL connection: ${connection}`);
				const que = connection.query(query, parameters, function (err, rows) {
					connection.release();
					if (err){
						logger.log("error", `Failed to execute query: ${que.sql}`, error);
						reject(err);
					}
					logger.log('info', `Successfully performed query: ${que.sql}`);
					if (typeof rows !== 'undefined') {
						if (postProcessor instanceof Function) return postProcessor(rows);
						else resolve(rows);
					} else {
						resolve([]);
					}
				});
			});
		});
	};
}
module.exports = OpalSQLQuery;
