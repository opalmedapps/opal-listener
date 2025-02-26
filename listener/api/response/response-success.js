// SPDX-FileCopyrightText: Copyright 2017 Opal Health Informatics Group at the Research Institute of the McGill University Health Centre <john.kildea@mcgill.ca>
//
// SPDX-License-Identifier: AGPL-3.0-or-later

const OpalResponse = require('./response');
/**
 * @class OpalResponseSuccess
 *
 */
class OpalResponseSuccess extends OpalResponse {
	constructor(data, reqObj) {
		super(3,data,reqObj);
	}
	toLegacy() {
		this.data.Code = this.code;
		this.data.EncryptionKey = this.reqObj.auth.hashedUID;
		this.data.Salt =  this.reqObj.auth.salt;
		this.data.Headers = {RequestKey:this.reqObj.key,RequestObject:this.reqObj.toLegacy()};
		return this.data;
	}
}
module.exports = OpalResponseSuccess;
