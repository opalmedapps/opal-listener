// SPDX-FileCopyrightText: Copyright 2023 Opal Health Informatics Group at the Research Institute of the McGill University Health Centre <john.kildea@mcgill.ca>
//
// SPDX-License-Identifier: AGPL-3.0-or-later

import OpalResponse from './response.js';

class OpalSecurityResponseSuccess {
    constructor(data, requestKey, requestObject) {
        this.data = data;
        this.requestKey = requestKey;
        this.requestObject = requestObject;
    }

    toLegacy() {
        return {
            Response: 'success',
            Code: OpalResponse.CODE.SUCCESS,
            Data: this.data,
            Headers: {
                RequestKey: this.requestKey,
                RequestObject: this.requestObject,
            },
        };
    }
}

export default OpalSecurityResponseSuccess;
