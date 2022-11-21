const OpalResponse = require('./response');
/**
 * @class OpalResponseError;
 * @type {exports.OpalResponseError}
 */

class OpalResponseError extends OpalResponse {

	constructor(code, data, reqObj, errorDetail, errorBack){
		super(code, data, reqObj);
		this.errorBackend = errorBack;
		this.errorDetail = errorDetail;
	}
	toJSON(){
		return {
			code: this.code,
			errorBackend: this.errorBackend,
			errorUser: this.data,
			errorDetail: this.errorDetail,
		};
	}
	toLegacy() {
		return {
			Code: this.code,
			Reason: this.data,
			...( this.errorDetail ? {Details: this.errorDetail} : undefined),
			Headers: {
				RequestKey: this.reqObj.key,
				RequestObject: this.reqObj.toLegacy(),
			},
			EncryptionKey: this.reqObj.auth.hashedUID,
			Salt: this.reqObj.auth.salt
		};
	}
}
module.exports = {OpalResponseError};
