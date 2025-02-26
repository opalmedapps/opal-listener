// SPDX-FileCopyrightText: Copyright 2022 Opal Health Informatics Group at the Research Institute of the McGill University Health Centre <john.kildea@mcgill.ca>
//
// SPDX-License-Identifier: AGPL-3.0-or-later

const { ApiRequestHandler } = require('../../../api-request-handler');
const logger = require('../../../../logs/logger');
const { OpalSQLQueryRunner } = require('../../../../sql/opal-sql-query-runner');
const { param } = require('express-validator');
const sqlInterface = require('../../../sqlInterface');
const utility = require('../../../../utility/utility');
const { ValidationError } = require('../../../errors/validation-error');

class GetOneItemHandler extends ApiRequestHandler {

    static validators = [
        param("category", "Must provide a valid category from requestMappings").exists().custom(value => {
            const requestMappings = sqlInterface.getSqlApiMappings();
            return requestMappings.hasOwnProperty(value);
        }),
        param("serNum", "Must provide a positive integer serNum").exists().isInt({ gt: 0 }),
    ];

    /**
     * @description Returns a single item (document, appointment, etc.) based on its SerNum. This is done by calling
     *              'sqlSingleItem' queries provided in sqlInterface's requestMappings.
     * @param {OpalRequest} requestObject The request object.
     * @returns {Promise<{Data: *}>} An object with Data containing the category as the key and an array with the item
     *                               as its value (same return format as the 'Refresh' request for compatibility).
     */
    static async handleRequest(requestObject) {
        // Validate request parameters
        const errors = await GetOneItemHandler.validate(requestObject.parameters);
        if (!errors.isEmpty()) {
            logger.log("error", "Validation Error", errors);
            throw new ValidationError(errors.errors);
        }
        let { category, serNum } = requestObject.parameters;
        let serNumInt = parseInt(serNum);
        const patientSerNum = parseInt(requestObject.meta.TargetPatientID);
        const requestMappings = sqlInterface.getSqlApiMappings();

        // Get the SQL query or module
        const mapping = requestMappings[category];
        const sqlSingleItem = mapping.sqlSingleItem;
        const moduleSingleItem = mapping.moduleSingleItem ? mapping.moduleSingleItem[`${category}Single`] : undefined;

        // Call the SQL query or function defined to get the requested item
        let rows;
        if (sqlSingleItem) {
            const needUserId = mapping.needUserId;
            const params = needUserId ? [requestObject.meta.UserID, patientSerNum, serNumInt] : [patientSerNum, serNumInt];
            rows = await OpalSQLQueryRunner.run(sqlSingleItem, params, mapping.processFunction);
        }
        else if (moduleSingleItem) {
            return await moduleSingleItem.handleRequest({
                meta: {
                    TargetPatientID: patientSerNum,
                    UserID: requestObject.meta.UserID,
                },
                params: requestObject.parameters,
            });
            // Note: at this time, mapping.processFunction is not designed to work with single items for modules
        }
        else throw new Error(`GetOneItem request failed: Single item processing is not implemented for category '${category}'`);

        // The response format is the same as the 'Refresh' request to be able to use these responses interchangeably
        return {
            Data: utility.resolveEmptyResponse({
                [category]: rows
            }),
        };
    }
}

module.exports = GetOneItemHandler;
