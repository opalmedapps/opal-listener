const config = require('./../config.json');
const SQLQueryRunner = require('./sql-query-runner');

/**
 * This class serves as a static class to query OpalDB, currently since the `sqlInterface.runSqlQuery` is pervasive
 * through the whole application we use this to simulate that behaviour while decoupling the sqlInterface file slightly
 */
class OpalSQLQueryRunner {
    /******************************
     * CONFIGURATIONS
     ******************************/
    #OPAL_DB_CREDENTIALS = {
        connectionLimit: 10,
        host: config.HOST,
        user: config.MYSQL_USERNAME,
        password: config.MYSQL_PASSWORD,
        database: config.MYSQL_DATABASE,
        dateStrings: true,
        port: config.MYSQL_DATABASE_PORT
    };
    #opalQueryInstance = new SQLQueryRunner(this.#OPAL_DB_CREDENTIALS);
    constructor(){
        throw new Error("This class cannot be istantiated, use static method: run()");
    }
    static run=(...args)=>OpalSQLQueryRunner.#opalQueryInstance.run(...args);
}
module.exports = OpalSQLQueryRunner;