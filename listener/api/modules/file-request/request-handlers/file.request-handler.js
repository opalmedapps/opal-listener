// SPDX-FileCopyrightText: Copyright 2021 Opal Health Informatics Group at the Research Institute of the McGill University Health Centre <john.kildea@mcgill.ca>
//
// SPDX-License-Identifier: AGPL-3.0-or-later

import ApiRequestHandler from '../../../api-request-handler.js';
import FileRequest from '../classes/file-request.js';
import logger from '../../../../logs/logger.js';
import {param} from 'express-validator';
import ValidationError from '../../../errors/validation-error.js';

class FileRequestHandler extends ApiRequestHandler {

    static validators = [
        param("url", "Must provide valid url")
            .exists()
            .isString()
            .notEmpty()
            .isURL(),
    ];

    static async handleRequest(requestObject) {
        // Validate the request
        const errors = await FileRequestHandler.validate(requestObject.parameters);
        if (!errors.isEmpty()) {
            logger.log("error", "Validation Error", errors);
            throw new ValidationError(errors);
        }

        logger.log("info", `Requesting file from: ${requestObject.parameters.url}`);

        // Create a FileRequest object to process the request
        const file = new FileRequest(requestObject.parameters.url);

        return {
            "data": await file.getFileBase64(),
        }
    }
}

export default FileRequestHandler;
