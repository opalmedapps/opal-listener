/*
 * Filename     :   ssl.js
 * Description  :   Handles access to the SSL certificate files used to make https requests.
 * Created by   :   Stacey Beard
 * Date         :   2021-09-15
 */
var exports             = module.exports = {};
const config            = require("../config.json");
const fs                = require('fs');

/*
 * To aid in debugging, the following line can be added to legacy-server.js to disable certificate validation:
 *     process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";
 * This environment variable makes HTTPS insecure, which is why its use is strongly discouraged. To use for debugging only.
 * -SB */

/**
 * @description Reads this server's SSL certificate from the file system and adds it to a request options object
 *              (as used by the npm 'request' package). Directly modifies the provided options object.
 *              If no SSL certificate is provided or found, an error is thrown.
 *              For more information on certificate use, see: https://www.npmjs.com/package/request#tlsssl-protocol
 * @author Stacey Beard
 * @date 2021-09-15
 * @param {Object} options - An options object as expected by the npm 'request' package.
 */
exports.attachCertificate = function(options) {
    // Helper functions
    let errorMsg = (details) => { return `Could not attach certificate: ${details}` };
    let sslConfigExists = (name) => { return config.SSL && config.SSL[name] && config.SSL[name] !== "" };

    // Validate that the necessary configurations are available
    let configs = ["CERTIFICATE_FILE", "CERTIFICATE_AUTHORITY_FILE"];
    for (let config of configs) if (!sslConfigExists(config)) throw errorMsg(`no value was provided for SSL.${config} in the config file`);
    if (!options) throw errorMsg("certificate couldn't be attached to an undefined options object");

    // Try to load the certificate information from the files
    try {
        const cert = fs.readFileSync(config.SSL.CERTIFICATE_FILE);
        const ca = fs.readFileSync(config.SSL.CERTIFICATE_AUTHORITY_FILE);

        // Attach the certificate information to the provided request options object
        options.cert = cert;
        options.ca = ca;
    }
    catch (error) {
        throw errorMsg("error accessing the certificate files: " + JSON.stringify(error));
    }
};
