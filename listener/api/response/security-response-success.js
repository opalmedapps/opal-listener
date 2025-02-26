const OpalResponse = require('./response');

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

module.exports = OpalSecurityResponseSuccess;
