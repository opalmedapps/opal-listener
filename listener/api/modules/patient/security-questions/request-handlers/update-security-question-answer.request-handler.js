const {ApiRequestHandler} = require("../../../../api-request-handler");
const {Patient} = require("../../patient");
const {ValidationError} = require("../../../../errors/validation-error");
const logger = require("../../../../../logs/logger");
const {param} = require("express-validator");
const SecurityDjango = require("../../../../../security/securityDjango");

class UpdateSecurityQuestionAnswerRequestHandler extends ApiRequestHandler {
    /**
     * validate the parameters coming from the front-end
     */
    static validators = [
        param("questionAnswerArr", "Must provide valid questionAnswerArr parameter")
            .exists()
            .isArray(),
        param("questionAnswerArr.*.question", "Must provide valid question property")
            .exists()
            .isString(),
        param("questionAnswerArr.*.answer", "Must provide valid answer property")
            .exists()
            .isString()
            .notEmpty(),
        param("questionAnswerArr.*.questionId", "Must provide valid questionId property")
            .exists()
            .isNumeric(),
    ];

    /**
     * Handler for the UpdateSecurityQuestionAnswer request
     * @param {OpalRequest} requestObject
     * @returns {Promise<{data: {Response: string, patientSerNum: number}}>}
     */
    static async handleRequest(requestObject) {

        const errors = await UpdateSecurityQuestionAnswerRequestHandler.validate(requestObject.parameters);
        if (!errors.isEmpty()) {
            logger.log("error", "Validation Error", errors);
            throw new ValidationError(errors.errors);
        }

        const patient = await Patient.getPatientByUsername(requestObject.meta.UserID);
        await SecurityDjango.updateSecurityQuestionAndAnswerList(requestObject.meta.UserID, requestObject.parameters.questionAnswerArr);
        return {
            "data": {
                "patientSerNum": patient.patientSerNum,
            }
        };
    }
}

module.exports = UpdateSecurityQuestionAnswerRequestHandler;
