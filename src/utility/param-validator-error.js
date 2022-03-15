/**
 * @file Error class used by param-validator; wrapper for errors returned by express-validator.
 * @author Stacey Beard
 */

class ValidationError extends Error {
    /**
     * @param validationResult Object returned by the validationResult function of express-validator.
     */
    constructor(validationResult) {
        super('Param validation failed');
        this.name = 'ValidationError';
        this.details = validationResult;
    }
}

exports.ValidationError = ValidationError;
