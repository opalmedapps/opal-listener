// SPDX-FileCopyrightText: Copyright 2017 Opal Health Informatics Group <info@opalmedapps.tld>
//
// SPDX-License-Identifier: Apache-2.0

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
