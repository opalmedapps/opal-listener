const {ApiRequestHandler} = require("../../../api-request-handler");
const {HospitalSettings} = require("../classes/hospital-settings");
const logger = require("../../../../logs/logger");
const {param} = require("express-validator");
const {ValidationError} = require("../../../errors/validation-error");

class HospitalSettingsRequestHandler extends ApiRequestHandler {
    /**
     * validate the parameters coming from the front-end
     */
    static validators = [
        param("patientSerNum", "Must provide valid patientSerNum parameter")
            .exists()
            .isString()
            .notEmpty(),
        param("institutionCode", "Must provide valid institutionCode parameter")
            .exists()
            .isString()
            .notEmpty(),
        param("language", "Must provide valid language parameter")
            .exists()
            .isString()
            .notEmpty(),
    ];

    /**
     * Handler for the HospitalSettings request, returns hospital's info (e.g., parking sites, direction urls)
     * @param {OpalRequest} requestObject
     * @returns {Promise<{data: {site: string, url: string}}>}
     */
    static async handleRequest(requestObject){
        const errors = await HospitalSettingsRequestHandler.validate(requestObject.parameters);
        if (!errors.isEmpty()) {
            logger.log("error", "Validation Error", errors);
            throw new ValidationError(errors.errors());
        }

        logger.log("info", `Requesting hospital settings information from the Python API using the following ${requestObject.parameters['hospitalKey']} hospitalKey and ${requestObject.parameters['language']} language`);

        const hospitalSettings = new HospitalSettings(
            requestObject.parameters['patientSerNum'],
            requestObject.parameters['institutionCode'],
            requestObject.parameters['language']
        );

        return {
            "data": await hospitalSettings.getInfo()
        }
    }
}

module.exports = HospitalSettingsRequestHandler;

