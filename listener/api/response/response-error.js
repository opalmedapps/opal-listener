// SPDX-FileCopyrightText: Copyright 2017 Opal Health Informatics Group at the Research Institute of the McGill University Health Centre <john.kildea@mcgill.ca>
//
// SPDX-License-Identifier: AGPL-3.0-or-later

import OpalResponse from './response.js';

class OpalResponseError extends OpalResponse {

	constructor(code, data, reqObj, errorDetail){
		super(code, data, reqObj);
		this.errorDetail = errorDetail;
	}
	toLegacy() {
		return {
			Code: this.code,
			Reason: this.data,
			...(this.errorDetail ? {Details: this.errorDetail} : undefined),
			Headers: {
				RequestKey: this.reqObj.key,
				RequestObject: this.reqObj.toLegacy(),
			},
			EncryptionKey: this.reqObj.auth.hashedUID,
			Salt: this.reqObj.auth.salt
		};
	}
}

export default OpalResponseError;
