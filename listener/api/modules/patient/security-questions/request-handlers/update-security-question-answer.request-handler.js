// SPDX-FileCopyrightText: Copyright 2020 Opal Health Informatics Group at the Research Institute of the McGill University Health Centre <john.kildea@mcgill.ca>
//
// SPDX-License-Identifier: AGPL-3.0-or-later

import ApiRequestHandler from '../../../../api-request-handler.js';
import logger from '../../../../../logs/logger.js';
import {param} from 'express-validator';
import Patient from '../../patient.js';
import SecurityDjango from '../../../../../security/securityDjango.js';
import ValidationError from '../../../../errors/validation-error.js';

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
     * @returns {Promise<{data: {patientSerNum: number}}>}
     */
    static async handleRequest(requestObject) {
        const errors = await UpdateSecurityQuestionAnswerRequestHandler.validate(requestObject.parameters);
        if (!errors.isEmpty()) {
            logger.log("error", "Validation Error", errors);
            throw new ValidationError(errors.errors);
        }

        const patient = await Patient.getPatientByUsername(requestObject.meta.UserID);
        let questionAnswerArr = requestObject.parameters.questionAnswerArr;

        await SecurityDjango.updateSecurityQuestionAndAnswerList(requestObject.meta.UserID, questionAnswerArr);

        return {
            "data": {
                "patientSerNum": patient.patientSerNum,
            }
        };
    }
}

export default UpdateSecurityQuestionAnswerRequestHandler;
