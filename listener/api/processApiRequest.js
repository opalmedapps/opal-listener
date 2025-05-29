// SPDX-FileCopyrightText: Copyright 2016 Opal Health Informatics Group at the Research Institute of the McGill University Health Centre <john.kildea@mcgill.ca>
//
// SPDX-License-Identifier: AGPL-3.0-or-later

import apiPatientUpdate from './apiPatientUpdate.js';
import apiHospitalUpdate from './apiHospitalUpdate.js';
import security from './../security/security.js';
import logger from './../logs/logger.js';

// New API handlers
import fileRequest from './modules/file-request/api.js';
import general from './modules/general/api.js';
import securityQuestions from './modules/patient/security-questions/api.js';
import testResults from './modules/test-results/api.js';

const omitParametersFromLogs = apiHospitalUpdate.omitParametersFromLogs;
const logPatientRequest = apiPatientUpdate.logPatientRequest;

/**
 * API HANDLERS FOR GENERAL REQUESTS
 * @type {Object}
 */
const LEGACYAPI = {
    'DeviceIdentifier': apiHospitalUpdate.updateDeviceIdentifier,
    'Log': apiPatientUpdate.logActivity,
    'LogPatientAction': apiPatientUpdate.logPatientAction,
    'Login': apiPatientUpdate.login,
    'Logout': apiPatientUpdate.logout,
    'Refresh': apiPatientUpdate.refresh,
    'AccountChange': apiHospitalUpdate.accountChange,
    'Checkin': apiHospitalUpdate.checkIn,
    'DocumentContent': apiPatientUpdate.getDocumentsContent,
    'Feedback': apiHospitalUpdate.inputFeedback,
    // Deprecated API entry: 'NotificationsNew', since QSCCD-125
    'NotificationsNew': apiHospitalUpdate.getNewNotifications,
    'EducationalPackageContents': apiPatientUpdate.getPackageContents,
    // Deprecated API entry: 'QuestionnaireInOpalDBFromSerNum', since QSCCD-1559
    'QuestionnaireInOpalDBFromSerNum': apiPatientUpdate.getQuestionnaireInOpalDB,
    // Deprecated API entry: 'QuestionnaireList' is now accessed via sqlInterface's requestMappings (since QSCCD-230)
    'QuestionnaireList': apiPatientUpdate.getQuestionnaireList,
    'Questionnaire': apiPatientUpdate.getQuestionnaire,
    'QuestionnairePurpose': apiPatientUpdate.getQuestionnairePurpose,
    'EducationalMaterialRating': apiHospitalUpdate.inputEducationalMaterialRating,
    'QuestionnaireSaveAnswer': apiHospitalUpdate.questionnaireSaveAnswer,
    'QuestionnaireUpdateStatus': apiHospitalUpdate.questionnaireUpdateStatus,
    'Read': apiHospitalUpdate.updateReadStatus,
    // TODO: Modify/refactor 'Studies' endpoint so it takes into account 'TargetPatientID' parameter.
    // Since the studies module is in the 'Chart tab' and contains patient data, the endpoint should
    // identify the target patient of a request (chosen using the profile selector) and make sure that
    // the current user has permission to access the target patient's data.
    // One of the solutions is to move the endpoint to the 'requestMappings' in the 'sqlInterface'.
    'Studies': apiPatientUpdate.getStudies,
    'StudyQuestionnaires': apiPatientUpdate.getStudyQuestionnaires,
    'StudyUpdateStatus': apiHospitalUpdate.studyUpdateStatus,
    // Deprecated API entry: 'PFPMembers', since QSCCD-417
    'PFPMembers': apiPatientUpdate.getPatientsForPatientsMembers
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
