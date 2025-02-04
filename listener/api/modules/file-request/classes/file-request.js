// SPDX-FileCopyrightText: Copyright 2021 Opal Health Informatics Group at the Research Institute of the McGill University Health Centre <john.kildea@mcgill.ca>
//
// SPDX-License-Identifier: AGPL-3.0-or-later

const axios = require('axios');

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
     * @date 2021-08-20
     * @description Fetches a file from the internet (at this._url) and returns the content in base64 encoding.
     *              Source: https://stackoverflow.com/questions/17124053/node-js-get-image-from-web-and-encode-with-base64
     * @returns {Promise<Object>} Resolves to a data object containing the base64 content and content-type.
     */
    async getFileBase64() {
        let requestParams = {
            method: 'get',
            url: encodeURI(this._url), // Required to work with extended character sets (such as French accent characters)
            responseType: 'arraybuffer', // Allows conversion to base64
        };

        let response = await axios(requestParams);

        return {
            contentType: response.headers["content-type"],
            base64Data: Buffer.from(response.data, 'binary').toString('base64'),
        };
    }
}

module.exports = {FileRequest};
