const {ApiRequestHandler} = require("../../../../api-request-handler");
const {Patient} = require("../../patient");
const {PatientSecurityQuestion} = require("../classes/patient-security-question");
const {ValidationError} = require("../../../../errors/validation-error");
const logger = require("../../../../../logs/logger");
const {param} = require("express-validator");

class UpdateSecurityQuestionAnswerRequestHandler extends ApiRequestHandler {
    /**
     * validate the parameters coming from the front-end
     */
    static validators = [
        param("questionAnswerArr", "Must provide valid questionAnswerArr parameter")
            .exists()
            .isArray(),
        param("questionAnswerArr.*.questionSerNum", "Must provide valid questionSerNum property")
            .exists()
            .isNumeric(),
        param("questionAnswerArr.*.answer", "Must provide valid answer property")
            .exists()
            .isString()
            .notEmpty(),
        param("questionAnswerArr.*.securityAnswerSerNum", "Must provide valid securityAnswerSerNum property")
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
        const patientSecurityQuestion = new PatientSecurityQuestion(patient);

        await patientSecurityQuestion.updateSecurityQuestionAndAnswer(requestObject.parameters.questionAnswerArr);

        return {
            "data": {
                "patientSerNum": patient.patientSerNum,
            }
        };
    }
}

module.exports = UpdateSecurityQuestionAnswerRequestHandler;
