const { param, validationResult } = require('express-validator');

/**
 * This class serves as an interface for any api request handler (for any request in the front-end)
 * it implements:
 *  - A validator, which validates the parameters of the requests, by default the validator is the identity
 *  - A handle request, handles request
 */
class ApiRequestHandler {
    /**
     * Array of validators
     * @type {ValidatorChain[]}
     */
    static validators = [];

    /**
     * Validates the parameters using the list of validators for the requests. 
     * @param parameters
     * @returns {Promise<Result<{param: "_error"; msg: any; nestedErrors: ValidationError[];
     *  location?: undefined; value?: undefined} | {location: Location; param: string; value: any; msg: any; nestedErrors?: unknown[]}>>} returns errors from validator result from validator library
     */
    static async validate (parameters){
        let req = {"params": parameters};
        await Promise.all(this.validators.map((validator)=> validator.run(req)));
        return validationResult(req);
    }
    /**
     * This class serves as an interface for the API handlers to implement.
     * @param {OpalRequest} requestObject request object coming from front-end
     * @returns {Promise<*>} requestObject request object coming from front-end
     */
    static async handleRequest(requestObject){
        throw new Error("Must be implemented by child class");
    }    
}
module.exports = {ApiRequestHandler};