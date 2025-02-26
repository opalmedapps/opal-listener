// SPDX-FileCopyrightText: Copyright 2023 Opal Health Informatics Group <info@opalmedapps.tld>
//
// SPDX-License-Identifier: Apache-2.0

class OpalSecurityResponseError {
    constructor(code, reason, requestKey, requestObject) {
        this.code = code;
        this.reason = reason;
        this.requestKey = requestKey;
        this.requestObject = requestObject;
    }

    toLegacy() {
        return {
            Response: 'error',
            Code: this.code,
            Reason: this.reason,
            Headers: {
                RequestKey: this.requestKey,
                RequestObject: this.requestObject,
            },
        };
    }
}

module.exports = OpalSecurityResponseError;
