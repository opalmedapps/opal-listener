// eslint-disable-next-line max-len
// SPDX-FileCopyrightText: Copyright 2022 Opal Health Informatics Group at the Research Institute of the McGill University Health Centre <john.kildea@mcgill.ca>
//
// SPDX-License-Identifier: AGPL-3.0-or-later

/**
 * @file Error class used by param-validator; wrapper for errors returned by express-validator.
 */

import { Result } from 'express-validator';

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

export default ValidationError;
