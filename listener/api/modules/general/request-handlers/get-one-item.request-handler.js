const { ApiRequestHandler } = require('../../../api-request-handler');
const logger = require('../../../../logs/logger');
const mysql = require('mysql');
const { OpalSQLQueryRunner } = require('../../../../sql/opal-sql-query-runner');
const { param } = require('express-validator');
const sqlInterface = require('../../../sqlInterface');
const utility = require('../../../../utility/utility');
const { ValidationError } = require('../../../errors/validation-error');

class GetOneItemHandler extends ApiRequestHandler {

    static validators = [
        param("category", "Must provide a valid category").exists().custom(value => {
            const requestMappings = sqlInterface.getSqlApiMappings();
            return requestMappings.hasOwnProperty(value);
        }),
        param("serNum", "Must provide a positive integer serNum").exists().isInt({ gt: 0 }),
    ];

    /**
     * @description Returns a single item (document, appointment, etc.) based on its SerNum.
     * @param {OpalRequest} requestObject The request object.
     * @returns {Promise<{Data: *}>} An object with Data containing the category as the key and an array with the item
     *                               as its value (same return format as the 'Refresh' request).
     */
    static async handleRequest(requestObject) {
        // Validate request parameters
        const errors = await GetOneItemHandler.validate(requestObject.parameters);
        if (!errors.isEmpty()) {
            logger.log("error", "Validation Error", errors);
            throw new ValidationError(errors.errors());
        }
        let { category, serNum } = requestObject.parameters;
        let serNumInt = parseInt(serNum);

        // Query the DB to get the requested item
        const requestMappings = sqlInterface.getSqlApiMappings();
        const itemQuery = requestMappings[category].sqlSingleItem;
        const params = [requestObject.meta.UserID, serNumInt];
        const rows = await OpalSQLQueryRunner.run(mysql.format(itemQuery, params));

        // The response format is the same as the 'Refresh' request to be able to use these responses interchangeably
        return {
            Data: utility.resolveEmptyResponse({
                [category]: rows
            }),
        };
    }
}

module.exports = GetOneItemHandler;
