// SPDX-FileCopyrightText: Copyright 2017 Opal Health Informatics Group at the Research Institute of the McGill University Health Centre <john.kildea@mcgill.ca>
//
// SPDX-License-Identifier: AGPL-3.0-or-later

/**  Library Imports **/

const opalResponse = require('../../../listener/api/response/response');
/**
 * @class opalResponseError;
 * @type {exports.opalResponseError}
 */

class opalResponseError extends opalResponse {

	constructor(code, data, reqObj, errorBack){
		super(code, data, reqObj);
		this.errorBackend = errorBack;
	}
	toJSON(){
		return {code: this.code, errorBackend:this.errorBackend, errorUser: this.data};
	}
	toLegacy() {
		return {Code: this.code, Reason: this.data, Headers:{RequestKey: this.reqObj.key, RequestObject: this.reqObj.toLegacy()
				}, EncryptionKey: this.reqObj.auth.pass, Salt: this.reqObj.auth.salt};
	}
}
module.exports = opalResponseError;
