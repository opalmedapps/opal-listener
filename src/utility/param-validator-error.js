// SPDX-FileCopyrightText: Copyright 2022 Opal Health Informatics Group <info@opalmedapps.tld>
//
// SPDX-License-Identifier: Apache-2.0

/**
 * @file Error class used by param-validator; wrapper for errors returned by express-validator.
 */

const { Result } = require('express-validator');

class ValidationError extends Error {
    /**
     * @param {Result} validationResult Object returned by the validationResult function of express-validator.
     */
    constructor(validationResult) {
        super(`Param validation failed: ${JSON.stringify(validationResult)}`);
        this.name = 'ValidationError';
        this.details = validationResult;
    }
}

exports.ValidationError = ValidationError;
