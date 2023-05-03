/**
 *
 */
class OpalRequest {
	constructor(reqObj, key, salt='', pass=''){
		this.type = reqObj.Request;
		this.parameters = reqObj.Parameters;
		this.key = key;
		this.auth = {salt: salt,pass: pass};
		this.meta = new RequestMeta(reqObj); // contains DeviceId, UserID, UserEmail, etc.
		delete reqObj.Request;
		delete reqObj.Parameters;
	}

	setAuthenticatedInfo(salt, hashedUID, type, params)
	{
		this.auth.salt = salt;
		this.auth.hashedUID = hashedUID;
		this.type = type;
		this.params = params;
	}
	toLegacy(){
		this.meta.Request = this.type;
		this.meta.Parameters = this.parameters;
		return this.meta;
	}
}

module.exports = OpalRequest;

class RequestMeta {
	constructor({DeviceId, UserID, TargetPatientID, Timestamp, UserEmail, AppVersion}) {
		this.DeviceId = DeviceId;
		this.UserID = UserID;
		this.TargetPatientID = TargetPatientID;
		this.Timestamp = Timestamp;
		this.UserEmail = UserEmail;
		this.AppVersion = AppVersion;
	}
}
