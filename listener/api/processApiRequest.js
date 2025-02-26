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
 * @type {Object}
 */
const LEGACYAPI = {
    'DeviceIdentifier': apiHospitalUpdate.updateDeviceIdentifier,
    'Log': apiPatientUpdate.logActivity,
    'LogPatientAction': apiPatientUpdate.logPatientAction,
    'Login': apiPatientUpdate.login,
    'Logout': apiPatientUpdate.logout,
    'UserPatient': apiPatientUpdate.getUserPatient,
    'Refresh': apiPatientUpdate.refresh,
    'AccountChange': apiHospitalUpdate.accountChange,
    'CheckCheckin': apiPatientUpdate.checkCheckin,
    'Checkin': apiHospitalUpdate.checkIn,
    'DocumentContent': apiPatientUpdate.getDocumentsContent,
    'Feedback': apiHospitalUpdate.inputFeedback,
    // Deprecated API entry: 'NotificationsNew', since QSCCD-125
    'NotificationsNew': apiHospitalUpdate.getNewNotifications,
    'EducationalPackageContents': apiPatientUpdate.getPackageContents,
    'QuestionnaireInOpalDBFromSerNum': apiPatientUpdate.getQuestionnaireInOpalDB,
    // Deprecated API entry: 'QuestionnaireList' is now accessed via sqlInterface's requestMappings (since QSCCD-230)
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
    const target = requestObject.meta.TargetPatientID;
    // Old requests
    logger.log('info', `Processing request of type: '${type}', with params = ${JSON.stringify(requestObject.params)}${target ? ', TargetPatientID = '+target : ''}`);
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
