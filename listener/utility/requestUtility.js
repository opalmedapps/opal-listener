/*
 * Filename     :   requestUtility.js
 * Description  :   Convenience utility that handles common uses of the 'request' package.
 * Created by   :   Stacey Beard
 * Date         :   2021-11-15
 */
var exports             = module.exports = {};
const logger            = require("../logs/logger");
const request           = require('request');
const ssl               = require("../security/ssl");
const utility           = require("../utility/utility");

/**
 * @description Promisified version of the 'request' function, which also takes care of some basic error handling.
 *              Attaches SSL certificates before making an https request.
 * @author Stacey Beard
 * @date 2021-11-15
 * @param {Object} options - The options required by 'request'.
 * @returns {Promise<Object>} Resolves on success of the request, with an object containing the response and
 *                            response body, or rejects with an error.
 */
exports.request = function(options) {
    return new Promise((resolve, reject) => {
        // Helper function
        let error = (errMsg) => { return `Error making request: ${errMsg}. Options provided: ${utility.stringifyShort(options)}` };

        // Validate input
        if (!options) reject(error("cannot make a request without an options parameter"));
        else if (!options.url || options.url === "") reject(error("the 'url' parameter is required to make a request"));
        else if (!options.method || options.method === "") reject(error("the 'method' parameter is required to make a request via the request utility"));
        else {
            // Add an SSL certificate to the request's options if a certificate is provided for this listener
            try {
                if (options.url.includes("https")) ssl.attachCertificate(options);
            }
            catch (error) { logger.log('warn', `Making https request without a certificate: ${error}`) }

            request(options, function(err, response, body) {
                logger.log('verbose', 'Request response: ' + utility.stringifyShort(response));
                logger.log('verbose', 'Request response body: ' + utility.stringifyShort(body));

                if (err) reject(error(JSON.stringify(err)));
                else if (!response) reject(error("no response received"));
                else if (response.statusCode !== 200) {
                    reject(error(`request returned with a response status other than '200 OK': status = ${response.statusCode}, body = ${utility.stringifyShort(body)}`));
                }
                else {
                    resolve({
                        body: body,
                        response: response,
                    });
                }
            });
        }
    });
};
