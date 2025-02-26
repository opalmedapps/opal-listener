// SPDX-FileCopyrightText: Copyright 2022 Opal Health Informatics Group at the Research Institute of the McGill University Health Centre <john.kildea@mcgill.ca>
//
// SPDX-License-Identifier: AGPL-3.0-or-later

const { ApiRequestHandler } = require('../../../api-request-handler');
const questionnaireQuestionnaireDB = require('../../../../questionnaires/questionnaireQuestionnaireDB');

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
        // Ideally, use the language provided by the user in the request. If not found, use the language of the patient.
        const userLanguage = requestObject.params.Language || patient.language;

        const patientInfoSubset = {
            PatientSerNum: patient.patientSerNum,
            Language: userLanguage,
        };
        return {
            data: {
                patientSerNum: patient.patientSerNum,
                questionnaireList: await questionnaireQuestionnaireDB.getQuestionnaireList(patientInfoSubset, userId, purpose, lastUpdated),
            },
        };
    }
}

module.exports = QuestionnaireListHandler;
