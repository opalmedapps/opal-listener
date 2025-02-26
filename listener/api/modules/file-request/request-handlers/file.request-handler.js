const {ApiRequestHandler} = require("../../../api-request-handler");
const {FileRequest} = require("../classes/file-request");
const logger = require("../../../../logs/logger");
const {param} = require("express-validator");
const {ValidationError} = require("../../../errors/validation-error");

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
            logger.log("error", "Validation Error", {error: errors});
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

module.exports = FileRequestHandler;
