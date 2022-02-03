/**
 * @file Provides functions used to validate input or object parameters.
 * @author David Herrera, Stacey Beard
 */

const { param, validationResult } = require("express-validator");
const { ValidationError } = require('./param-validator-error');

class Validator {
    /**
     * @description Convenience function for using the express-validator and an array of ValidationChains
     *              to validate the attributes in an object.
     * @param {Object} object - An object with attributes to validate.
     * @param {ValidationChain[]} validators - An array of ValidationChains as provided by param from express-validator.
     * @returns {Promise<void>} Resolves if all object parameters are valid, or rejects with the error object provided
     *                          by express-validator.
     */
    static async validate(object, validators) {
        const paramsObject = { "params": object };
        await Promise.all(validators.map(validator => validator.run(paramsObject)));
        const errors = validationResult(paramsObject);

        if (!errors.isEmpty()) throw new ValidationError(errors);
    }
}

exports.Validator = Validator;

// Note: param is exported alongside Validator to shorten necessary imports in files that use this utility.
exports.param = param;
