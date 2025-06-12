// SPDX-FileCopyrightText: Copyright 2023 Opal Health Informatics Group at the Research Institute of the McGill University Health Centre <john.kildea@mcgill.ca>
//
// SPDX-License-Identifier: AGPL-3.0-or-later

import ApiRequestHandler from '../../../api-request-handler.js';
import logger from '../../../../logs/logger.js';
import { param } from 'express-validator';
import questionnaireConfig from '../../../../questionnaires/questionnaireConfig.json' with { type: "json" };
import questionnaireOpalDB from '../../../../questionnaires/questionnaireOpalDB.js';
import questionnaireQuestionnaireDB from '../../../../questionnaires/questionnaireQuestionnaireDB.js';
import utility from '../../../../utility/utility.js';
import ValidationError from '../../../errors/validation-error.js';

const languages = ['FR', 'EN'];

class QuestionnaireListSingleHandler extends ApiRequestHandler {

    static validators = [
        param('language', `Must provide a valid language string among [${languages}]`).isIn(languages),
        param("serNum", 'Must provide a positive integer serNum').isInt({ gt: 0 }),
    ];

    /**
     * @description Returns a single entry (based on 'QuestionnaireList') from the list of questionnaires for a given patient.
     *              This is a 'GetOneItem' module for requests of type 'QuestionnaireList': see GetOneItemHandler and sqlInterface's requestMappings.
     * @param {OpalRequest} requestObject OpalRequest object
     */
    static async handleRequest(requestObject) {
        // Validate request parameters
        const errors = await QuestionnaireListSingleHandler.validate(requestObject.params);
        if (!errors.isEmpty()) {
            logger.log("error", "Validation Error", errors);
            throw new ValidationError(errors.errors);
        }

        const patientSerNum = requestObject.meta.TargetPatientID;
        const userId = requestObject.meta.UserID;
        const userLanguage = requestObject.params.language;
        const questionnaireSerNum = requestObject.params.serNum;
        const allPurposes = Object.keys(questionnaireConfig.QUESTIONNAIRE_PURPOSE_ID_MAP);
        const errorMessage = (message) => `${message} for userId = ${userId} accessing patient with PatientSerNum = ${patientSerNum}`;

        const patientInfoSubset = {
            PatientSerNum: patientSerNum,
            Language: userLanguage,
        };

        // Get the questionnaire's answerQuestionnaireId (qp_ser_num) to be able to look it up in QuestionnaireDB
        let answerQuestionnaireId = await questionnaireOpalDB.getAnswerQuestionnaireIdFromSerNum(questionnaireSerNum);

        // Get all questionnaires from this patient, then extract the right one from the list
        let promiseResults = await Promise.all(allPurposes.map(purpose => questionnaireQuestionnaireDB.getQuestionnaireList(patientInfoSubset, userId, purpose)));
        let rows = promiseResults.flat(1);
        if (!rows || rows.length === 0) throw errorMessage('No questionnaires found');
        let singleQuestionnaireEntry = rows.find(row => row.qp_ser_num === answerQuestionnaireId);
        if (!singleQuestionnaireEntry) throw errorMessage(`Single questionnaire entry with questionnaireSerNum = ${questionnaireSerNum} not found`);

        // The response format is the same as the 'Refresh' request (and other 'GetOneItem' requests) to be able to use them interchangeably
        return {
            Data: utility.resolveEmptyResponse({
                QuestionnaireList: [singleQuestionnaireEntry],
            }),
        };
    }
}

export default QuestionnaireListSingleHandler;
