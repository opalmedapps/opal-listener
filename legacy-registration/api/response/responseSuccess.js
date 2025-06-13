// SPDX-FileCopyrightText: Copyright 2020 Opal Health Informatics Group at the Research Institute of the McGill University Health Centre <john.kildea@mcgill.ca>
//
// SPDX-License-Identifier: AGPL-3.0-or-later

import opalResponse from '../../../listener/api/response/response.js';

class opalResponseSuccess extends opalResponse {
    constructor(data, reqObj) {
        super(3, data, reqObj);
    }
    toLegacy() {
        this.data.Code = this.code;
        this.data.EncryptionKey = this.reqObj.auth.pass;
        this.data.Salt = this.reqObj.auth.salt;
       // this.data.Headers = { RequestKey: this.reqObj.key};
        this.data.Headers = {RequestKey:this.reqObj.key,RequestObject:this.reqObj.toLegacy()};
        return this.data;
    }
}

export default opalResponseSuccess;
