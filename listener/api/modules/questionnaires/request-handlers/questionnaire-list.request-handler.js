// SPDX-FileCopyrightText: Copyright 2022 Opal Health Informatics Group at the Research Institute of the McGill University Health Centre <john.kildea@mcgill.ca>
//
// SPDX-License-Identifier: AGPL-3.0-or-later

import ApiRequestHandler from '../../../api-request-handler.js';
import config from '../../../../config-adaptor.js';
import questionnaireQuestionnaireDB from '../../../../questionnaires/questionnaireQuestionnaireDB.js';

class QuestionnaireListHandler extends ApiRequestHandler {
    /**
     * @description Returns the list of questionnaires for the given patient.
     *              If a 'Date' param is provided, only questionnaires added after this date are returned.
     * @param {OpalRequest} requestObject OpalRequest object
     */
    static async handleRequest(requestObject) {
        const lastUpdated = requestObject.params.Date ? new Date(Number(requestObject.params.Date)) : 0;
        const patient = await QuestionnaireListHandler.getTargetPatient(requestObject);
        const userId = requestObject.meta.UserID;
        const purpose = requestObject.params?.purpose;

        // Translate based on the user's language, if available; otherwise, use the fallback language
        const language = ['EN', 'FR'].includes(requestObject.meta.AcceptLanguage) ? requestObject.meta.AcceptLanguage : config.FALLBACK_LANGUAGE;

        const patientInfoSubset = {
            PatientSerNum: patient.patientSerNum,
            Language: language,
        };
        return {
            data: {
                patientSerNum: patient.patientSerNum,
                questionnaireList: await questionnaireQuestionnaireDB.getQuestionnaireList(patientInfoSubset, userId, purpose, lastUpdated),
            },
        };
    }
}

export default QuestionnaireListHandler;
