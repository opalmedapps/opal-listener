const apiPatientUpdate      = require('./apiPatientUpdate.js');
const apiHospitalUpdate     = require('./apiHospitalUpdate.js');
const security              = require('./../security/security');
const logger                = require('./../logs/logger');

// New API handlers
const fileRequest = require("./modules/file-request");
const general = require('./modules/general');
const securityQuestions = require("./modules/patient/security-questions");
const testResults = require("./modules/test-results");

/**
 * API HANDLERS FOR GENERAL REQUESTS
 * @type {{DeviceIdentifier: *, Log: *, Login: *, Logout: *, Resume: *, Refresh: *, AccountChange: *, CheckCheckin: *, Checkin: *, CheckinUpdate: *, DocumentContent: *, Feedback: *, MapLocation: *, Message: *, NotificationsAll: *, Questionnaires: *, QuestionnaireRating: *, QuestionnaireAnswers: *, Read: *, PFPMembers: *, AppointmentDelays: *}}
 */
const LEGACYAPI = {
    'DeviceIdentifier': apiHospitalUpdate.updateDeviceIdentifier,
    'Log': apiPatientUpdate.logActivity,
    'LogPatientAction': apiPatientUpdate.logPatientAction,
    'Login': apiPatientUpdate.login,
    'Logout': apiPatientUpdate.logout,
    'Resume': apiPatientUpdate.resume,
    'Refresh': apiPatientUpdate.refresh,
    'AccountChange': apiHospitalUpdate.accountChange,
    'CheckCheckin': apiPatientUpdate.checkCheckin,
    'Checkin': apiHospitalUpdate.checkIn,
    'CheckinUpdate': apiPatientUpdate.checkinUpdate,
    'DocumentContent': apiPatientUpdate.getDocumentsContent,
    'Feedback': apiHospitalUpdate.inputFeedback,
    'MapLocation': apiPatientUpdate.getMapLocation,
    'Message': apiHospitalUpdate.sendMessage,
    // Deprecated API entry: 'NotificationsNew', since QSCCD-125
    'NotificationsNew': apiHospitalUpdate.getNewNotifications,
    'EducationalPackageContents': apiPatientUpdate.getPackageContents,
    'QuestionnaireInOpalDBFromSerNum': apiPatientUpdate.getQuestionnaireInOpalDB,
    // Deprecated API entry: 'QuestionnaireList' is now accessed via sqlInterface's requestMappings
    'QuestionnaireList': apiPatientUpdate.getQuestionnaireList,
    'Questionnaire': apiPatientUpdate.getQuestionnaire,
    'EducationalMaterialRating': apiHospitalUpdate.inputEducationalMaterialRating,
    'QuestionnaireSaveAnswer': apiHospitalUpdate.questionnaireSaveAnswer,
    'QuestionnaireUpdateStatus': apiHospitalUpdate.questionnaireUpdateStatus,
    'Read': apiHospitalUpdate.updateReadStatus,
    //Deprecate API entry: 'PFPMembers', since QSCCD-417
    'PFPMembers': apiPatientUpdate.getPatientsForPatientsMembers
};

/**
 * API HANDLERS FOR SECURITY SPECIFIC REQUESTS
 * @type {{SecurityQuestion: *, SetNewPassword: *, VerifyAnswer: *}}
 */
exports.securityAPI = {
    'SecurityQuestion': security.securityQuestion,
    'SetNewPassword': security.resetPasswordRequest,
    'VerifyAnswer': security.resetPasswordRequest
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
    // Old requests
    logger.log('debug', `Processing request of type: ${type}`);
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
