/**
 * @class OpalResponseSuccess
 *
 */
class OpalResponse {

    /**
     * @desc Custom error codes used in Opal responses. These codes are used by the app to interpret the type of
     *       response received.
     */
    static CODE = {
        AUTHENTICATION_ERROR: 1, // Similar to 401 Unauthorized HTTP Code
        SERVER_ERROR: 2, // Similar to 500 Server Error HTTP Code
        SUCCESS: 3, // Similar to 200 OK HTTP Code
        TOO_MANY_ATTEMPTS: 4, // Specific case of 401 Unauthorized HTTP Code
        BAD_REQUEST: 400, // 400 Bad Request HTTP Code
    }

    constructor(code, data, reqObj) {
        this.code = code;
        this.data = data;
        this.reqObj = reqObj;
    }
}

module.exports = OpalResponse;
