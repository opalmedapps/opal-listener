var exports = module.exports = {};
const Q                     = require('q');
const apiPatientUpdate      = require('./apiPatientUpdate.js');
const apiHospitalUpdate     = require('./apiHospitalUpdate.js');
const security              = require('./../security/security');
const logger                = require('./../logs/logger');
const modules               = require('./modules');
// New API handlers
const tests = require("./patient/test-result");

/**
 * API HANDLERS FOR GENERAL REQUESTS
 * @type {{DeviceIdentifier: *, Log: *, Login: *, Logout: *, Resume: *, Refresh: *, AccountChange: *, CheckCheckin: *, Checkin: *, CheckinUpdate: *, DocumentContent: *, Feedback: *, LabResults: *, MapLocation: *, Message: *, NotificationsAll: *, Questionnaires: *, QuestionnaireRating: *, QuestionnaireAnswers: *, Read: *, PFPMembers: *, AppointmentDelays: *}}
 */
const LEGACYAPI = {
    'DeviceIdentifier': apiHospitalUpdate.updateDeviceIdentifier,
    'Log': apiPatientUpdate.logActivity,
    'LogPatientAction': apiPatientUpdate.logPatientAction,
    'Login': apiPatientUpdate.login,
    'Logout': apiHospitalUpdate.logout,
    'Resume': apiPatientUpdate.resume,
    'Refresh': apiPatientUpdate.refresh,
    'AccountChange': apiHospitalUpdate.accountChange,
    'CheckCheckin': apiPatientUpdate.checkCheckin,
    'Checkin': apiHospitalUpdate.checkIn,
    'CheckinUpdate': apiPatientUpdate.checkinUpdate,
    'DocumentContent': apiPatientUpdate.getDocumentsContent,
    'Feedback': apiHospitalUpdate.inputFeedback,
    'LabResults': apiPatientUpdate.getLabResults,
    'MapLocation': apiPatientUpdate.getMapLocation,
    'Message': apiHospitalUpdate.sendMessage,
    'NotificationsAll': apiHospitalUpdate.getAllNotifications,
    'NotificationsNew': apiHospitalUpdate.getNewNotifications,
    'EducationalPackageContents': apiPatientUpdate.getPackageContents,
    'Questionnaires': apiPatientUpdate.getQuestionnaires,
    'QuestionnaireRating': apiHospitalUpdate.inputEducationalMaterialRating,
    'QuestionnaireAnswers': apiHospitalUpdate.inputQuestionnaireAnswers,
    'Read': apiHospitalUpdate.updateReadStatus,
    'PFPMembers': apiPatientUpdate.getPatientsForPatientsMembers,
    'AppointmentDelays': modules.appointmentDelays.requestHandler,
    'MyWaitingTime': modules.myWaitingTime.requestHandler
};

/**
 * API HANDLERS FOR SECURITY SPECIFIC REQUESTS
 * @type {{PasswordReset: *, SecurityQuestion: *, SetNewPassword: *, VerifyAnswer: *}}
 */
exports.securityAPI = {
    'PasswordReset': security.resetPasswordRequest,
    'SecurityQuestion': security.securityQuestion,
    'SetNewPassword': security.resetPasswordRequest,
    'VerifyAnswer': security.resetPasswordRequest
};
/**
 * New API handlers
 * @type {{PatientTestDates: {(OpalRequest): Promise<*>, (*): Promise<void>}, PatientTestTypeResults: {(OpalRequest): Promise<OpalResponseError|*>, (*): Promise<void>}, PatientTestDateResultsHandler: {(OpalRequest): Promise<OpalResponseError|*>, (*): Promise<void>}, PatientTestTypes: {(OpalRequest): Promise<*>, (*): Promise<void>}}}
 */
const API = {...tests};

/**
 * processRequest
 * @desc Maps the incoming requestObject to the correct API function to handle it
 * @param requestObject
 * @return {Promise}
 */
exports.processRequest=function(requestObject) {
    const type = requestObject.type;
    // Old requests
    logger.log('debug', 'Processing request of type: ' + type);
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