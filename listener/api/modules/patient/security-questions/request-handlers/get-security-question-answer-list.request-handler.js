// SPDX-FileCopyrightText: Copyright 2020 Opal Health Informatics Group at the Research Institute of the McGill University Health Centre <john.kildea@mcgill.ca>
//
// SPDX-License-Identifier: AGPL-3.0-or-later

import ApiRequestHandler from '../../../../api-request-handler.js';
import Patient from '../../patient.js';
import SecurityDjango from '../../../../../security/securityDjango.js';

class GetSecurityQuestionAnswerListRequestHandler extends ApiRequestHandler{
    /**
     * Handler for the SecurityQuestionAnswerList request, returns 2 list for security questions related to the current user
     * @param {OpalRequest} requestObject
     * @returns {Promise<{data: {patientSerNum: number, securityQuestionList: [], activeSecurityQuestions: []}}>}
     */
    static async handleRequest(requestObject){
        const patient = await Patient.getPatientByUsername(requestObject.meta.UserID);

        let securityQuestionList = await SecurityDjango.getSecurityQuestionList(requestObject.meta.UserID);
        if (securityQuestionList.length === 0) throw "API call returned a empty list of questions for the current user";

        let activeSecurityQuestions = await SecurityDjango.getActiveSecurityQuestions(requestObject.meta.UserID);
        if (activeSecurityQuestions.length === 0) throw "API call returned a empty list of all the active questions";

        return {
            "data": {
                "patientSerNum": patient.patientSerNum,
                "securityQuestionList": securityQuestionList,
                "activeSecurityQuestions": activeSecurityQuestions,
            }
        };
    }
}

export default GetSecurityQuestionAnswerListRequestHandler;
