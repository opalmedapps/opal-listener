const apiPatientUpdate      = require('./apiPatientUpdate.js');
const apiHospitalUpdate     = require('./apiHospitalUpdate.js');
const security              = require('./../security/security');
const logger                = require('./../logs/logger');

// New API handlers
const fileRequest = require("./modules/file-request");
const general = require('./modules/general');
const securityQuestions = require("./modules/patient/security-questions");
const testResults = require("./modules/test-results");

const omitParametersFromLogs = apiHospitalUpdate.omitParametersFromLogs;

/**
 * API HANDLERS FOR GENERAL REQUESTS
 * @type {Object}
 */
const LEGACYAPI = {
    'DeviceIdentifier': apiHospitalUpdate.updateDeviceIdentifier,
    'Log': apiPatientUpdate.logActivity,
    'LogPatientAction': apiPatientUpdate.logPatientAction,
    // Deprecated API entry: 'Login'
    'Login': apiPatientUpdate.login,
    'Logout': apiPatientUpdate.logout,
    'Refresh': apiPatientUpdate.refresh,
    'AccountChange': apiHospitalUpdate.accountChange,
    // Deprecated API entry: 'CheckCheckin'
    'CheckCheckin': apiPatientUpdate.checkCheckin,
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
    // Deprecated API entry: 'QuestionnaireNumberUnread'
    'QuestionnaireNumberUnread': apiPatientUpdate.getQuestionnaireUnreadNumber,
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
exports.securityAPI = {
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
exports.processRequest=function(requestObject) {
    const type = requestObject.type;
    const target = requestObject.meta.TargetPatientID;
    let parametersString = JSON.stringify(requestObject.params);
    if (omitParametersFromLogs.hasOwnProperty(type) && omitParametersFromLogs[type](requestObject.params)) parametersString = 'OMITTED FROM LOGS';

    // Old requests
    logger.log('info', `Processing request of type: '${type}', with params = ${parametersString}${target ? ', TargetPatientID = '+target : ''}`);
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
};

exports.logPatientRequest = function(requestObject) {
    return apiPatientUpdate.logPatientRequest(requestObject);
};
