const { Patient } = require('./modules/patient/patient');
const { validationResult } = require('express-validator');

/**
 * This class serves as an interface for any api request handler (for any request in the front-end)
 * it implements:
 *  - A validator, which validates the parameters of the requests, by default the validator is the identity
 *  - A handle request, handles request
 */
class ApiRequestHandler {
    /**
     * Array of validators
     * @type {ValidatorChain[]}
     */
    static validators = [];

    /**
     * Validates the parameters using the list of validators for the requests. 
     * @param parameters
     * @returns {Promise<Result<{param: "_error"; msg: any; nestedErrors: ValidationError[];
     *  location?: undefined; value?: undefined} | {location: Location; param: string; value: any; msg: any; nestedErrors?: unknown[]}>>} returns errors from validator result from validator library
     */
    static async validate (parameters){
        let req = {"params": parameters};
        await Promise.all(this.validators.map((validator)=> validator.run(req)));
        return validationResult(req);
    }
    /**
     * This class serves as an interface for the API handlers to implement.
     * @param {OpalRequest} requestObject request object coming from front-end
     * @returns {Promise<*>} requestObject request object coming from front-end
     */
    static async handleRequest(requestObject){
        throw new Error("Must be implemented by child class");
    }

    /**
     * @desc Returns the Patient who is the target of a request. Uses a TargetPatientID if it's provided,
     *       otherwise returns the 'self' patient based on UserID.
     * @param requestObject The request object.
     * @param [requestObject.meta.TargetPatientID] If provided, this value is used as the PatientSerNum of the patient.
     * @param requestObject.meta.UserID Fallback value used to look up the self PatientSerNum if TargetPatientID isn't provided.
     * @returns {Promise<Patient>} Resolves with the target patient for the request.
     */
    static async getTargetPatient(requestObject) {
        return requestObject.meta.TargetPatientID ?
            await Patient.getPatientBySerNum(requestObject.meta.TargetPatientID) :
            await Patient.getPatientByUsername(requestObject.meta.UserID);
    }
}
module.exports = {ApiRequestHandler};
