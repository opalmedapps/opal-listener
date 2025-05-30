// SPDX-FileCopyrightText: Copyright 2020 Opal Health Informatics Group at the Research Institute of the McGill University Health Centre <john.kildea@mcgill.ca>
//
// SPDX-License-Identifier: AGPL-3.0-or-later

import ApiRequestHandler from '../../../../api-request-handler.js';
import Patient from '../../patient.js';
import ValidationError from '../../../../errors/validation-error.js';
import OpalSQLQueryRunner from '../../../../../sql/opal-sql-query-runner.js';
import opalQueries from '../../../../../sql/queries.js';
import logger from '../../../../../logs/logger.js';
import {param} from 'express-validator';
import SecurityDjango from '../../../../../security/securityDjango.js';
import Version from '../../../../../../src/utility/version.js';

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
        // Only validate the parameters return from the app when the version is after 1.12.2
        if (Version.versionGreaterThan(requestObject.meta.AppVersion, Version.version_1_12_2)) {
            const errors = await UpdateSecurityQuestionAnswerRequestHandler.validate(requestObject.parameters);
            if (!errors.isEmpty()) {
                logger.log("error", "Validation Error", errors);
                throw new ValidationError(errors.errors);
            }
        }

        const patient = await Patient.getPatientByUsername(requestObject.meta.UserID);
        const Language = (await OpalSQLQueryRunner.run(opalQueries.patientTableFields(), [patient.patientSerNum]))[0].Language;
        let questionAnswerForLowerVersion = [];
        let questionAnswerArr = requestObject.parameters.questionAnswerArr;
        // Updating security question and answer array format read by the app has changed after 1.12.2
        if (Version.versionLessOrEqual(requestObject.meta.AppVersion, Version.version_1_12_2)) {
            let apiResponse
            let question
            for (var key in questionAnswerArr) {
                if (Object.hasOwn(questionAnswerArr[key], "questionSerNum") && (questionAnswerArr[key].questionSerNum !== null) && (questionAnswerArr[key].questionSerNum !== undefined)){
                    // Call Backend API to retrieve question from SecurityQuestion model when the active question is selected and updated
                    apiResponse = await SecurityDjango.getSpecificActiveSecurityQuestion(requestObject.meta.UserID, questionAnswerArr[key].questionSerNum);
                    question = (Language == 'EN') ? apiResponse.title_en : apiResponse.title_fr;
                }
                else{
                    // Call Backend API to retrieve question from SecurityAnswer model
                    apiResponse = await SecurityDjango.getSpecificSecurityQuestion(requestObject.meta.UserID, questionAnswerArr[key].securityAnswerSerNum);
                    question = apiResponse.question
                }
                questionAnswerForLowerVersion.push({
                    question: question,
                    questionId: questionAnswerArr[key].securityAnswerSerNum,
                    answer: questionAnswerArr[key].answer
                });
            }
            // reformat the array value to match data structure before and equal version 1.12.2
            await SecurityDjango.updateSecurityQuestionAndAnswerList(requestObject.meta.UserID, questionAnswerForLowerVersion);
        }
        // new data structure after version 1.12.2
        else{
            await SecurityDjango.updateSecurityQuestionAndAnswerList(requestObject.meta.UserID, questionAnswerArr);
        }

        return {
            "data": {
                "patientSerNum": patient.patientSerNum,
            }
        };
    }
}

export default UpdateSecurityQuestionAnswerRequestHandler;
