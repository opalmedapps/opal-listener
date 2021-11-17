const requestUtility    = require("../../../../utility/requestUtility");

/**
 * @description Class representing a request to a file from the internet.
 */
class FileRequest {
    /**
     * @param url The url of the file to request.
     */
    constructor(url) {
        this._url = url;
    }

    /**
     * @author Stacey Beard
     * @date 2021-08-20
     * @description Fetches a file from the internet (at this._url) and returns the content in base64 encoding.
     *              Source: https://stackoverflow.com/questions/17124053/node-js-get-image-from-web-and-encode-with-base64
     * @returns {Promise<Object>} Resolves to a data object containing the base64 content and content-type.
     */
    async getFileBase64() {
        let options = {
            method: "get",
            url: encodeURI(this._url), // Required to work with non-standard characters (such as French characters)
            encoding: null, // Allows conversion to base64
        };

        let { response, body } = await requestUtility.request(options);

        return {
            contentType: response.headers["content-type"],
            base64Data: Buffer.from(body).toString('base64'),
        };
    }
}

module.exports = {FileRequest};
