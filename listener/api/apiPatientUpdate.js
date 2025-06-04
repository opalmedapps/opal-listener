// SPDX-FileCopyrightText: Copyright 2016 Opal Health Informatics Group at the Research Institute of the McGill University Health Centre <john.kildea@mcgill.ca>
//
// SPDX-License-Identifier: AGPL-3.0-or-later

import q from 'q';
import sqlInterface from './sqlInterface.js';
import utility from '../utility/utility.js';
import queries from '../sql/queries.js';
import logger from '../logs/logger.js';
import questionnaires from '../questionnaires/questionnaireOpalDB.js';
import Version from '../../src/utility/version.js';

/**
 *@name login
 *@requires sqlInterface
 *@parameter(string) UserID Patients user ID
 *@description 1.12.2 and prior: Queries and returns all patient data to be available at login.
 *             After 1.12.2: Doesn't do anything anymore, but was kept to record 'Login' in PatientActivityLog.
 */
async function login(requestObject) {
    if (Version.versionLessOrEqual(requestObject.AppVersion, Version.version_1_12_2)) {
        let patientSerNum = await sqlInterface.getSelfPatientSerNum(requestObject.UserID);
        let loginData = await sqlInterface.getPatientTableFields(requestObject.UserID, patientSerNum, requestObject.Parameters.Fields, requestObject.Parameters);

        // Filter out notification types that break app version 1.12.2 (most importantly 'NewLabResult')
        let appBreakingNotifications = ['NewLabResult', 'NewMessage', 'Other'];
        if (Array.isArray(loginData?.Data?.Notifications)) {
            loginData.Data.Notifications = loginData.Data.Notifications.filter(
                notif => !appBreakingNotifications.includes(notif.NotificationType)
            );
        }

        return loginData;
    }
    else {
        // The only purpose of the login request is to record a timestamp in PatientActivityLog (done automatically in logPatientRequest)
        return Promise.resolve({ Response: "Login recorded" });
    }
}

/**
 * @desc Retrieves patient data in a given set of categories. This function is called 'refresh' because it can be used
 *       to fetch only fresh data after a certain timestamp.
 * @param requestObject The request object.
 * @param {string} requestObject.UserID The Firebase user ID that will be used to get data if no PatientSerNum is provided.
 * @param {string[]} requestObject.Parameters.Fields The list of data categories from which to fetch data.
 * @param [requestObject.Parameters.Timestamp] Optional date/time; if provided, only items with 'LastUpdated' after this time are returned.
 * @returns {Promise<*>}
 */
async function refresh(requestObject) {
    let UserId = requestObject.UserID;
    let parameters = requestObject.Parameters;
    let fields = parameters.Fields;
    if (!parameters.purpose) parameters.purpose = 'clinical'; // Default to clinical for legacy requests by app version 1.12.2

    // If there's a TargetPatientID, use it, otherwise get data for self
    let patientSerNum = requestObject.TargetPatientID ? requestObject.TargetPatientID : await sqlInterface.getSelfPatientSerNum(UserId);
    logger.log('verbose', `Identified request target as PatientSerNum = ${patientSerNum}`);

    if (!fields) throw {Response:'error', Reason:"Undefined 'Fields' in Refresh request"};
    if (!Array.isArray(fields)) fields = [fields];

    let rows = await sqlInterface.getPatientTableFields(UserId, patientSerNum, fields, parameters);
    rows.Data = utility.resolveEmptyResponse(rows.Data);

    return rows;
}

// Get the contents of an educational material package.
const getPackageContents = sqlInterface.getPackageContents;

const getDocumentsContent = sqlInterface.getDocumentsContent;

/**
*@name getStudies
*@description Gets the studies associated with the current patient.
*@param {object} requestObject
*@returns {Promise}
*/
const getStudies = sqlInterface.getStudies;

/**
*@name getStudyQuestionnaires
*@description Gets the questionnaires associated with the current study.
*@param {object} requestObject
*@returns {Promise}
*/
const getStudyQuestionnaires = sqlInterface.getStudyQuestionnaires;

function logActivity(requestObject) {
    logger.log('verbose', 'User Activity', {
        deviceID:requestObject.DeviceId,
        userID:requestObject.UserID,
        request:requestObject.Request,
        activity:requestObject.Parameters.Activity,
        activityDetails: requestObject.Parameters.ActivityDetails
    });
    return q.resolve({Response:'success'});
}

// Log a patient action (clicked, scrolled to bottom, etc.).
const logPatientAction = sqlInterface.logPatientAction;

const logPatientRequest = sqlInterface.addToActivityLog;

// API call to log user out
function logout(requestObject) {
    // For now, the only purpose of the logout request is to record a timestamp in PatientActivityLog (done separately in logPatientRequest)
    return Promise.resolve({Response: "Successful logout"});
}

/**
 * For questionnaire V2 (2019 version of qplus questionnaire front-end). Getting the list of questionnaires belonging to a patient
 * @deprecated Since QSCCD-230
 * @param {object} requestObject
 * @returns {Promise}
 */
const getQuestionnaireList = questionnaires.getQuestionnaireList;

/**
 * For questionnaire V2 (2019 version of qplus questionnaire front-end).
 * Getting the information about a questionnaire stored in OpalDB from its QuestionnaireSerNum
 * @deprecated Since QSCCD-1559, in released versions after 1.12.2.
 * @param {object} requestObject
 * @returns {Promise}
 */
const getQuestionnaireInOpalDB = questionnaires.getQuestionnaireInOpalDB;

/**
 * For questionnaire V2 (2019 version of qplus questionnaire front-end). Gets one questionnaire.
 * @param {object} requestObject
 * @returns {Promise}
 */
const getQuestionnaire = questionnaires.getQuestionnaire;

/**
* Gets the purpose of the current questionnaire.
* @param {object} requestObject
* @returns {Promise}
*/
const getQuestionnairePurpose = questionnaires.getQuestionnairePurpose;

/**
 * @deprecated
 * @returns
 */
function getPatientsForPatientsMembers() {
  return new Promise((resolve, reject)=>{
      sqlInterface.runSqlQuery(queries.getPatientForPatientMembers(),[]).then((members)=>{
         resolve({Data:members});
      }).catch((err) => reject({Response:error, Reason:err}));
  });
}

export default {
    login,
    refresh,
    getPackageContents,
    getDocumentsContent,
    getStudies,
    getStudyQuestionnaires,
    logActivity,
    logPatientAction,
    logPatientRequest,
    logout,
    getQuestionnaireList,
    getQuestionnaireInOpalDB,
    getQuestionnaire,
    getQuestionnairePurpose,
    getPatientsForPatientsMembers,
}
