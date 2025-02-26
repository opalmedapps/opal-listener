const request = require('request').defaults({ encoding: null });  // 'encoding: null' allows conversion to base64

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
     * @returns {Promise<unknown>} Resolves to a data object containing the base64 content and content-type.
     */
    getFileBase64() {
        return new Promise((resolve, reject) => {
            // The url must be encoded to work with non-standard characters (such as French characters)
            request.get(encodeURI(this._url), function (error, response, body) {
                if (error) reject(error);
                else if (response.statusCode === 200) {
                    let data = {
                        contentType: response.headers["content-type"],
                        base64Data: Buffer.from(body).toString('base64'),
                    };
                    resolve(data);
                }
                else reject(`Request returned with a response status other than '200 OK': status = ${response.statusCode}`);
            });
        });
    }
}

module.exports = {FileRequest};
