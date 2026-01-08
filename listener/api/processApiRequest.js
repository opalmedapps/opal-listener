// SPDX-FileCopyrightText: Copyright 2016 Opal Health Informatics Group at the Research Institute of the McGill University Health Centre <john.kildea@mcgill.ca>
//
// SPDX-License-Identifier: AGPL-3.0-or-later

import fileRequest from './modules/file-request/api.js';
import general from './modules/general/api.js';
import logger from '../logs/logger.js';
import questionnaires from '../questionnaires/questionnaireOpalDB.js';
import security from '../security/security.js';
import securityQuestions from './modules/patient/security-questions/api.js';
import sqlInterface from './sqlInterface.js';
import testResults from './modules/test-results/api.js';

const omitParametersFromLogs = sqlInterface.omitParametersFromLogs;
const logPatientRequest = sqlInterface.addToActivityLog;

/**
 * API HANDLERS FOR GENERAL REQUESTS
 * @type {Object}
 */
const LEGACYAPI = {
    'AccountChange': sqlInterface.updateAccountField,
    'Checkin': sqlInterface.checkIn,
    'DeviceIdentifier': sqlInterface.updateDeviceIdentifier,
    'DocumentContent': sqlInterface.getDocumentsContent,
    'EducationalMaterialRating': sqlInterface.inputEducationalMaterialRating,
    'EducationalPackageContents': sqlInterface.getPackageContents,
    'Feedback': sqlInterface.inputFeedback,
    'Log': sqlInterface.logActivity,
    'Login': sqlInterface.login,
    'Logout': sqlInterface.logout,
    'LogPatientAction': sqlInterface.logPatientAction,
    'Questionnaire': questionnaires.getQuestionnaire,
    // Deprecated API entry: 'QuestionnaireList' is now accessed via sqlInterface's requestMappings (since QSCCD-230)
    'QuestionnaireList': questionnaires.getQuestionnaireList,
    'QuestionnairePurpose': questionnaires.getQuestionnairePurpose,
    'QuestionnaireSaveAnswer': questionnaires.questionnaireSaveAnswer,
    'QuestionnaireUpdateStatus': questionnaires.questionnaireUpdateStatus,
    'Read': sqlInterface.updateReadStatus,
    'Refresh': sqlInterface.refresh,
    // TODO: Modify/refactor 'Studies' endpoint so it takes into account 'TargetPatientID' parameter.
    // Since the studies module is in the 'Chart tab' and contains patient data, the endpoint should
    // identify the target patient of a request (chosen using the profile selector) and make sure that
    // the current user has permission to access the target patient's data.
    // One of the solutions is to move the endpoint to the 'requestMappings' in the 'sqlInterface'.
    'Studies': sqlInterface.getStudies,
    'StudyQuestionnaires': sqlInterface.getStudyQuestionnaires,
    'StudyUpdateStatus': sqlInterface.studyUpdateStatus,
};

/**
 * API HANDLERS FOR SECURITY SPECIFIC REQUESTS
 * @type {{SecurityQuestion: *, SetNewPassword: *, VerifyAnswer: *}}
 */
const securityAPI = {
    'SecurityQuestion': security.getSecurityQuestion,
    'SetNewPassword': security.resetPassword,
    'VerifyAnswer': security.verifySecurityAnswer,
};

/**
 * New API handlers
 * @type {{PatientTestDates: PatientTestCollectedDatesHandler, UpdateSecurityQuestionAnswer: UpdateSecurityQuestionAnswerRequestHandler, PatientTestTypeResults: PatientTestTypeResultsHandler, PatientTestDateResults: PatientTestCollectedDateResultsHandler, PatientTestTypes: PatientTestTypesHandler, RequestFile: FileRequestHandler, SecurityQuestionAnswerList: GetSecurityQuestionAnswerListRequestHandler}}
 */
const API = {
    ...fileRequest,
    ...general,
    ...securityQuestions,
    ...testResults,
};

/**
 * processRequest
 * @desc Maps the incoming requestObject to the correct API function to handle it
 * @param requestObject
 * @return {Promise}
 */
function processRequest(requestObject) {
    const type = requestObject.type;
    const target = requestObject.meta.TargetPatientID;
    let parametersString = JSON.stringify(requestObject.params);
    if (omitParametersFromLogs.hasOwnProperty(type) && omitParametersFromLogs[type](requestObject.params)) parametersString = 'OMITTED FROM LOGS';

    // Old requests
    logger.log('verbose', `Processing request of type: '${type}', with params = ${parametersString}${target ? ', TargetPatientID = '+target : ''}`);
    if (LEGACYAPI.hasOwnProperty(type)) {
        return LEGACYAPI[type](requestObject.toLegacy());
    // New request format
    }else if(API.hasOwnProperty(type)){
        let requestHandler = API[type];
        return requestHandler.handleRequest(requestObject);
    }else{
        logger.log("error", `Invalid request type: ${type}`);
        return Promise.reject("Invalid request type");
    }
}

export default {
    securityAPI,
    processRequest,
    logPatientRequest,
}
