// eslint-disable-next-line max-len
// SPDX-FileCopyrightText: Copyright 2022 Opal Health Informatics Group at the Research Institute of the McGill University Health Centre <john.kildea@mcgill.ca>
//
// SPDX-License-Identifier: AGPL-3.0-or-later

/**
 * @file Provides functions used to validate input or object parameters.
 */

const { param, validationResult, ValidationChain } = require('express-validator');
const { ValidationError } = require('./param-validator-error');

class Validator {
    /**
     * @description Convenience function for using the express-validator and an array of ValidationChains
     *              to validate the attributes in an object.
     * @param {object} object - An object with attributes to validate.
     * @param {ValidationChain[]} validators - An array of ValidationChains as provided by param from express-validator.
     * @returns {Promise<void>} Resolves if all object parameters are valid, or rejects with the error object provided
     *                          by express-validator.
     */
    static async validate(object, validators) {
        const paramsObject = { params: object };
        await Promise.all(validators.map(validator => validator.run(paramsObject)));
        const errors = validationResult(paramsObject);

        if (!errors.isEmpty()) throw new ValidationError(errors);
    }
}

exports.Validator = Validator;

// Export other express-validator components alongside Validator to shorten imports in files that use this utility.
exports.param = param;
exports.ValidationChain = ValidationChain;
