// SPDX-FileCopyrightText: Copyright 2015 Opal Health Informatics Group at the Research Institute of the McGill University Health Centre <john.kildea@mcgill.ca>
//
// SPDX-License-Identifier: AGPL-3.0-or-later

import axios from 'axios';
import config from '../config-adaptor.js';
import eduMaterialConfig from '../educational-material/eduMaterialConfig.json' with { type: "json" };
import filesystem from 'fs';
import logger from '../logs/logger.js';
import Mail from '../mailer/mailer.js';
import OpalSQLQueryRunner from '../sql/opal-sql-query-runner.js';
import Patient from './modules/patient/patient.js';
import Q from 'q';
import queries from '../sql/queries.js';
import questionnaires from './modules/questionnaires/api.js';
import SecurityDjango from '../security/securityDjango.js';
import studiesConfig from '../studies/studiesConfig.json' with { type: "json" };
import testResults from './modules/test-results/api.js';
import utility from '../utility/utility.js';
import Version from '../../src/utility/version.js';

/******************************
 * MAPPINGS
 ******************************/

/**
 * @description Table mappings and process data functions for results obtained from the database.
 *              Two formats of sub-objects are possible:
 *                1- Mappings with an 'sql' attribute are processed directly in this file, by executing the resulting query.
 *                   'numberOfLastUpdated' represents the number of times to insert a timestamp in the sql to get only
 *                   new results updated after a given timestamp.
 *                2- Mappings with a 'module' attribute are redirected to the `listener/api/module` folder to be served
 *                   by a request handler there.
 *              Note: either format can have an optional 'processFunction' attribute, which is run on the result before returning it.
 *
 * Deprecated: {Tasks: {sql, numberOfLastUpdated: number}}
 */
const requestMappings =
    {
        /**
         * Deprecated: 'Patient'
         */
        'Patient': {
            sql: queries.patientTableFields(),
            processFunction: loadProfileImagePatient,
            numberOfLastUpdated: 0,
        },
        'Documents': {
            sql: queries.patientDocumentsAll(),
            sqlSingleItem: queries.patientDocumentsOne(),
            numberOfLastUpdated: 2,
            table: 'Document',
            serNum: 'DocumentSerNum',
            needUserId: true,
            notificationType: ["Document", "UpdDocument"],
        },
        'Diagnosis': {
            sql: queries.patientDiagnosesAll(),
            sqlSingleItem: queries.patientDiagnosesOne(),
            numberOfLastUpdated: 1,
            table: 'Diagnosis',
            serNum: 'DiagnosisSerNum',
        },
        'Appointments': {
            sql: queries.patientAppointmentsAll(),
            sqlSingleItem: queries.patientAppointmentsOne(),
            processFunction: supportLegacyAppointmentResource,
            numberOfLastUpdated: 4,
            table: 'Appointment',
            serNum: 'AppointmentSerNum',
            needUserId: true,
            notificationType: [
                "AppointmentNew",
                "AppointmentTimeChange",
                "AppointmentCancelled",
                "CheckInNotification",
                "CheckInError",
                "NextAppointment",
                "RoomAssignment",
            ],
        },
        'Notifications': {
            sql: queries.patientNotificationsTableFields(),
            numberOfLastUpdated: 2,
            table: 'Notification',
            serNum: 'NotificationSerNum',
            needUserId: true,
        },
        /**
         * Deprecated: 'Tasks'
         */
        'Tasks': {
            sql: queries.patientTasksTableFields(),
            numberOfLastUpdated: 2,
        },
        'TxTeamMessages': {
            sql: queries.patientTxTeamMessagesAll(),
            sqlSingleItem: queries.patientTxTeamMessagesOne(),
            processFunction: decodePostMessages,
            numberOfLastUpdated: 2,
            table: 'TxTeamMessage',
            serNum: 'TxTeamMessageSerNum',
            needUserId: true,
            notificationType: "TxTeamMessage",
        },
        'EducationalMaterial': {
            sql: queries.patientEducationalMaterialAll(),
            sqlSingleItem: queries.patientEducationalMaterialOne(),
            processFunction: getEducationTableOfContents,
            numberOfLastUpdated: 3,
            table: 'EducationalMaterial',
            serNum: 'EducationalMaterialSerNum',
            needUserId: true,
            notificationType: "EducationalMaterial",
        },
        'Announcements': {
            sql: queries.patientAnnouncementsAll(),
            sqlSingleItem: queries.patientAnnouncementsOne(),
            processFunction: decodePostMessages,
            numberOfLastUpdated: 2,
            table: 'Announcement',
            serNum: 'AnnouncementSerNum',
            needUserId: true,
            notificationType: "Announcement",
        },
        'PatientTestDates': {
            module: testResults,
            processFunction: result => result.data.collectedDates,
        },
        'PatientTestTypes': {
            module: testResults,
            processFunction: result => result.data.testTypes,
        },
        'QuestionnaireList': {
            module: questionnaires,
            moduleSingleItem: questionnaires,
            processFunction: result => result.data.questionnaireList,
        },
        'patientStudy': {
            table: 'patientStudy',
            serNum: 'ID',
        }
    };

/**
 * @desc List of request types for which to omit parameters in PatientActivityLog or the logger.
 *       This is done to avoid logging sensitive information, such as passwords, security answers or private information.
 *       Each key is the name of a request type. The value represents a test. If the test returns true,
 *       the requests' parameters are omitted.
 * @type {object}
 */
const omitParametersFromLogs = {
    AccountChange: params => params.FieldToChange === 'Password',
    Feedback: () => true,
    QuestionnaireSaveAnswer: () => true,
    SecurityQuestion: () => true,
    UpdateSecurityQuestionAnswer: () => true,
    VerifyAnswer: () => true,
}

//////////////////////////////////////////////////////////////////

/******************************
 * FUNCTIONS
 ******************************/

/**
 * getSqlApiMapping
 * @return {Object}
 */
function getSqlApiMappings() {
    return requestMappings;
}

/**
 * runSqlQuery function runs query, its kept due to the many references
 * @desc runs inputted query against SQL mapping by grabbing an available connection from connection pool
 * @param query
 * @param parameters
 * @param processRawFunction
 * @return {Promise}
 */
const runSqlQuery = OpalSQLQueryRunner.run;

/**
 * @desc Fetches and returns data for the given patient in an array of categories from requestMappings.
 * @param {string} userId Firebase userId making the request.
 * @param patientSerNum The PatientSerNum of the patient.
 * @param {string[]} arrayTables The list of categories of data to fetch. Should be keys in requestMappings.
 * @param {object} parameters The parameters provided with the request.
 * @param [parameters.Timestamp] Optional date/time; if provided, only items with 'LastUpdated' after this time are returned.
 *                    If not provided, all data is returned (a default value of 0 is used to query the database).
 * @param {string} [parameters.purpose] Optional parameter that is used to filter questionnaires and educational materials by purpose. By default is set to "clinical" to support the old versions of the app.
 * @return {Promise}
 */
async function getPatientTableFields(userId, patientSerNum, arrayTables, parameters) {
    // Validate the arrayTables
    let invalidCategory = arrayTables.find(e => !requestMappings.hasOwnProperty(e));
    if (invalidCategory) throw {Response: 'error', Reason: `Incorrect refresh parameter: ${invalidCategory}`};

    logger.log('verbose', `Processing select requests in the following categories: ${JSON.stringify(arrayTables)}`);
    let response = await Promise.all(arrayTables.map(category => processSelectRequest(userId, category, patientSerNum, parameters)));
    // Arrange the return object with categories as keys and each corresponding response as a value
    let responseMapping = Object.fromEntries(arrayTables.map((category, i) => [category, response[i]]));
    return {
        Data: responseMapping,
        Response: 'success',
    };
}

/**
 * @desc Processes a request for data in one of the categories of requestMappings.
 *       If available, runs the category's 'processFunction' on the result before returning it.
 * @param {string} userId Firebase userId making the request.
 * @param {string} category The requested data category. Must be a key in requestMappings.
 * @param patientSerNum The patient's PatientSerNum.
 * @param {object} parameters The parameters provided with the request.
 * @param [parameters.timestamp] Optional date/time; if provided, only items with 'LastUpdated' after this time are returned.
 * @param {string} [parameters.purpose] Optional parameter that is used to filter questionnaires and educational materials by purpose. By default is set to "clinical" to support the old versions of the app.
 * @returns {Promise<*>}
 */
async function processSelectRequest(userId, category, patientSerNum, parameters) {
    const mapping = requestMappings[category];
    let date = parameters.Timestamp ? new Date(Number(parameters.Timestamp)) : new Date(0);

    // Request mappings with a 'module' attribute use request handlers in the `listener/api/modules` folder
    if (mapping.hasOwnProperty('module')) {
        let result = await mapping.module[category].handleRequest({
            meta: {
                TargetPatientID: patientSerNum,
                UserID: userId,
            },
            params: {
                Date: parameters.Timestamp,
                purpose: parameters.purpose,
                Language: parameters.Language,
            },
        });
        return mapping.processFunction ? mapping.processFunction(result) : result;
    }
    else if (mapping.hasOwnProperty('sql')) {
        let paramArray = mapping.needUserId ? [`"${userId}"`, patientSerNum] : [patientSerNum];
        paramArray = utility.addSeveralToArray(paramArray, date, mapping.numberOfLastUpdated);
        return await runSqlQuery(mapping.sql, paramArray, mapping.processFunction);
    }
    else throw new Error(`requestMapping for '${category}' does not have the necessary properties to complete the request`);
}

/**
 * updateReadStatus
 * @desc Update read status for a table
 * @return {Promise}
 */
function updateReadStatus(requestObject) {
    let r = Q.defer();

    let parameters = requestObject.Parameters;

    if (
        parameters
        && parameters.Field
        && parameters.Id
        && requestObject.TargetPatientID
        && requestMappings.hasOwnProperty(parameters.Field)
    ) {
        let {table, serNum, notificationType} = requestMappings[parameters.Field];

        runSqlQuery(
            queries.updateReadStatus(),
            [table, requestObject.UserID, table, serNum, parameters.Id],
        ).then(async () => {
            if (notificationType) {
                logger.log('verbose', `Implicitly marking ${notificationType} notification as read.`);
                await runSqlQuery(
                    queries.implicitlyReadNotification(),
                    [userId, `"${userId}"`, parameters.Id, requestObject.TargetPatientID, notificationType],
                );
            }
            r.resolve({Response:'success'});
        }).catch((err)=>{
            r.reject({Response:'error', Reason:err});
        });

    }else {
        r.reject({Response: 'error', Reason: 'Invalid read status field'});
    }
    return r.promise;
}

/**
 * logPatientAction
 * @desc Logs a patient action in the table PatientActionLog.
 *
 * requestObject must include the following fields:
 * @param requestObject
 * @param requestObject.Parameters
 * @param requestObject.Parameters.Action The action taken by the user (ex: CLICKED, SCROLLED_TO_BOTTOM, etc.).
 * @param requestObject.Parameters.RefTable The table containing the item the user acted upon
 *                                          (ex: EducationalMaterialControl).
 * @param requestObject.Parameters.RefTableSerNum The SerNum identifying the item the user acted upon in RefTable
 *                                                (ex: SerNum of a row in EducationalMaterialControl).
 * @param requestObject.Parameters.ActionTime The time at which the action occurred, in format 'yyyy-MM-dd HH:mm:ss',
 *                                            as reported by the app.
 * @returns {*}
 */
function logPatientAction(requestObject) {
    let r = Q.defer();

    // Check that the correct parameters are given.
    let {Action, RefTable, RefTableSerNum, ActionTime} = requestObject.Parameters;
    if(!Action) {
        r.reject({Response:'error',Reason:'Missing parameter Action for request LogPatientAction.'});
    }
    else if(!RefTable) {
        r.reject({Response:'error',Reason:'Missing parameter RefTable for request LogPatientAction.'});
    }
    else if(!RefTableSerNum) {
        r.reject({Response:'error',Reason:'Missing parameter RefTableSerNum for request LogPatientAction.'});
    }
    else if(!ActionTime) {
        r.reject({Response:'error',Reason:'Missing parameter ActionTime for request LogPatientAction.'});
    }
    else{
        // If the correct parameters were given, look up the user's PatientSerNum.
        getPatientFromEmail(requestObject.UserEmail).then((patient)=> {

            // Check that the response produced a patientSerNum.
            if (patient.PatientSerNum) {
                let patientSerNum = patient.PatientSerNum;

                // Log the patient action in the database.
                let queryParameters = [patientSerNum, Action, RefTable, RefTableSerNum, ActionTime];
                runSqlQuery(queries.logPatientAction(),queryParameters).then(()=>{

                    // Done logging the action successfully.
                    r.resolve({Response:'success'});

                }).catch((err)=>{
                    let errorReason3 = 'Error logging the patient action in the database.';
                    logger.log('error', errorReason3, err);
                    r.reject({Response:'error',Reason:errorReason3});
                });
            }
            else {
                let errorReason2 = 'No PatientSerNum found when looking up the user in the database.';
                logger.log('error', errorReason2);
                r.reject({Response:'error',Reason:errorReason2});
            }
        }).catch((err) => {
            let errorReason1 = 'Error looking up the user\'s PatientSerNum in the database.';
            logger.log('error', errorReason1, err);
            r.reject({Response:'error',Reason:errorReason1});
        });
    }
    return r.promise;
}

/**
 * @name getStudies
 * @desc Gets patient studies based on UserID
 * @param {object} requestObject
 * @returns {Promise}
 */
async function getStudies(requestObject) {
    try {
        let rows = await runSqlQuery(queries.patientStudyTableFields(), [requestObject.UserID]);

        rows.forEach(
            (row, id, arr) => arr[id].consentStatus = studiesConfig.STUDY_CONSENT_STATUS_MAP[arr[id].consentStatus]
        );

        let data = {studies: rows};

        return {Response: 'success', Data: data};
    }
    catch (error) { throw {Response: 'error', Reason: error}; }
}

/**
 * @name getStudyQuestionnaires
 * @desc Gets study questionnaires based on studyID
 * @param {object} requestObject
 * @returns {Promise}
 */
async function getStudyQuestionnaires(requestObject) {
    try {
        let rows = await runSqlQuery(
            queries.getStudyQuestionnairesQuery(),
            [requestObject.Parameters.studyID]
        );

        return {Response: 'success', Data: rows};
    }
    catch (error) { throw {Response: 'error', Reason: error}; }
}

/**
 * @name studyUpdateStatus
 * @desc Update consent status for a study.
 * @param {object} requestObject
 * @return {Promise}
 */
async function studyUpdateStatus(requestObject) {
    try {
        let parameters = requestObject.Parameters;
        if (parameters && parameters.questionnaire_id && parameters.status) {
            // get number corresponding to consent status string
            let statusNumber = Object.keys(
                studiesConfig.STUDY_CONSENT_STATUS_MAP
            ).find(
                key => studiesConfig.STUDY_CONSENT_STATUS_MAP[key] === parameters.status
            );

            await runSqlQuery(
                queries.updateConsentStatus(),
                [statusNumber, parameters.questionnaire_id, requestObject.UserID]
            );

            return {Response: 'success'};
        } else {
            throw {Response: 'error', Reason: 'Invalid parameters'};
        }
    }
    catch (error) { throw {Response: 'error', Reason: error}; }
}

/**
 * CHECKIN FUNCTIONALITY
 * ============================================================
 */

/**
 * checkIn
 * @description Checks the patient into their appointments for the day via the OIE.
 *  The checkIn process requires notifying multiple different systems of a new patient checkin.
 *      1) If the hospital source system supports appointment checkins, notify it
 *      2) If the Opal Wait Room Management system is enabled in this environment, notify it
 *      3) Always notify the OpalAdmin backend system
 *
 * @param requestObject
 * @return {Promise}
 */
async function checkIn(requestObject) {
    try {
        // If there's a TargetPatientID, use it, otherwise get data for self
        let patientSerNum = requestObject.TargetPatientID ? requestObject.TargetPatientID : await getSelfPatientSerNum(requestObject.UserID);
        let mrnList = await getMRNs(patientSerNum);
        let lastError;

        // Find sourceDatabaseSerNum and sourceSystemID for each appointment for the patient
        let appointmentDetails = await getAppointmentDetailsForPatient(patientSerNum);

        // Success booleans track individual success for each checkin system receiving an api call
        // source_system and orms are true by default in case those systems are not enabled, we still want checkin to succeed
        let orms_success = true;
        let source_system_success = true;
        let opal_success = false;

        // Attempt checkin to orms if enabled
        if (config.ORMS_ENABLED && config.ORMS_CHECKIN_URL) {
            orms_success = false;
            // TODO: Get rid of loop and send full mrnList to reduce API calls, after confirming orms supports mrnList
            for (let i = 0; i < mrnList.length; i++) {
                let mrnObj = mrnList[i];
                let mrn = mrnObj.MRN;
                let mrnSite = mrnObj.Hospital_Identifier_Type_Code;
                try {
                    await checkInToSystem(mrn, mrnSite, config.ORMS_CHECKIN_URL, null, null, "ORMS");
                    logger.log("verbose", `Success checking in to orms for PatientSerNum = ${patientSerNum} using MRN = ${mrn} (site = ${mrnSite})`);
                    orms_success = true;
                    break;
                } catch(error){
                    logger.log("verbose", `Failed to check in to orms for PatientSerNum = ${patientSerNum} using MRN = ${mrn} (site = ${mrnSite}); error: ${error}`);
                    lastError = error;
                }
            }
        }

        // Checkin to all appointments for opal and source system via loop
        // Note: all appointment checkins in this loop must be successful or success variable(s) will be false
        for (let appointment of appointmentDetails) {
            let sourceSystemID = appointment.SourceSystemID;
            let source = appointment.SourceDatabaseSerNum;

            // Attempt checkin to source system if enabled
            if (config.SOURCE_SYSTEM_SUPPORTS_CHECKIN && config.SOURCE_SYSTEM_CHECKIN_URL) {
                // set source system success false until a successful code is returned
                source_system_success = false;
                let mrnObj = mrnList[0];
                let mrn = mrnObj.MRN;
                let mrnSite = mrnObj.Hospital_Identifier_Type_Code;
                try {
                    await checkInToSystem(mrn, mrnSite, config.SOURCE_SYSTEM_CHECKIN_URL, null, sourceSystemID, "SOURCE");
                    logger.log("verbose", `Success checking in to source system for PatientSerNum = ${patientSerNum} using ${mrn}-${mrnSite}`);
                    source_system_success = true;
                }catch(error){
                    logger.log("verbose", `Failed to check in to source system for PatientSerNum = ${patientSerNum} using ${mrn}-${mrnSite}; error: ${error}`);
                    lastError = error;
                }
            }

            // Attempt checkin to opal backend
            let mrnObj = mrnList[0];
            let mrn = mrnObj.MRN;
            let mrnSite = mrnObj.Hospital_Identifier_Type_Code;
            try {
                await checkInToSystem(mrn, mrnSite, config.OPAL_CHECKIN_URL, source, sourceSystemID, "OPAL");
                logger.log("verbose", `Success checking in to opal for PatientSerNum = ${patientSerNum} using ${mrn}-${mrnSite}`);
                opal_success = true;
            }catch(error){
                logger.log("verbose", `Failed to check in to opal for PatientSerNum = ${patientSerNum} using ${mrn}-${mrnSite}; error: ${error}`);
                lastError = error;
            }
        }
        // If all success, get checked in appointments
        if (source_system_success && orms_success && opal_success) {
            let appointments = await getCheckedInAppointments(patientSerNum);
            if (appointments.Data && appointments.Data.length === 0) throw 'Appointments were not marked as checked-in for this patient in OpalDB';
            logger.log("verbose", `Today's checked in appointments for PatientSerNum = ${patientSerNum}`, appointments);
            let appSerNums = [];
            appointments['Data'].forEach(function(serNum){
                appSerNums.push(serNum['AppointmentSerNum']);
            });
            // Set CheckinUsername for all checked-in appointments
            await setCheckInUsername(requestObject, appSerNums);
            return appointments;
        }
        else throw lastError;
    }
    catch (error) {
        logger.log("error", "Uncaught error while processing a checkin request: ", {
            message: error.message || "No message",
            stack: error.stack || "No stack trace",
            response: error.response ? error.response.data : "No response data",
        });
        throw {Response: 'error', Reason: error};
    }
}

/**
 * @description Calls the system to check the patient in
 *              ORMS expects: mrn, site, room, checkinType (APP/KIOSK/VWR/SMS)
 *              Source Systems typically expect: appointmentId, location
 *              Opal expects: source_system_id, source_database
 * Note: ORMS by default checkins all appointments for today for the patient. Opal backend & source system do single appointment checkin.
 * @param {string} mrn One of the patient's medical record numbers.
 * @param {string} mrnSite The site to which the MRN belongs.
 * @param {string} url The API checkin url to be called.
 * @param {integer} sourceSystemSerNum The OpalDB identifier for the source system.
 * @param {string} sourceSystemID The unique identifier for the appointment from the source system.
 * @param {string} targetSystem The name of the checkin system being called.
 * @returns {Promise<void>} Resolves if check-in succeeds, otherwise rejects with an error.
 */
async function checkInToSystem(mrn, mrnSite, url, sourceSystemSerNum, sourceSystemID, targetSystem) {
    let data = {};
    let headers = {'Content-Type': 'application/json'};
    if (targetSystem === "ORMS") {
        // Currently, ORMS performs checkin for all of a patients appointments on that day
        data = {
            "mrn": mrn,
            "site": mrnSite,
            "room": config.CHECKIN_ROOM,
            "checkinType": "APP",
        };
    } else if (targetSystem === "SOURCE") {
        // Source does single appointment checkin
        data = {
            "appointmentId": sourceSystemID,
            "location": config.CHECKIN_ROOM,
        };
    } else {
        // Opal does single appointment checkin
        data = {
            "source_system_id": sourceSystemID,
            "source_database": sourceSystemSerNum,
            "checkin": 1,
        };
        headers = {
            'Authorization': `Token ${config.BACKEND_LISTENER_AUTH_TOKEN}`,
            'Content-Type': 'application/json',
        };

    }
    return await axios.post(url, data, {headers: headers});
}

/**
 * Gets the list of source system ids and source systems for each of today's appointments for a patient
 * @param {string} patientSerNum The Opal PatientSerNum
 * @returns {Promise<*>} Resolves with the appointment source details, or rejects with an error if not found.
*/
function getAppointmentDetailsForPatient(patientSerNum) {
    return runSqlQuery(queries.getAppointmentDetailsForPatient(), [patientSerNum]);
}



/**
 * Gets and returns all of a patients appointments on today's date
 * @param patientSerNum
 * @return {Promise}
 */
function getCheckedInAppointments(patientSerNum){
    return new Promise((resolve, reject) => {
        runSqlQuery(queries.getTodaysCheckedInAppointments(), [patientSerNum])
            .then(rows => resolve({Response:'success', Data: rows}))
            .catch(err => reject({Response: 'error', Reason: err}));
    })
}

/**
 * ============================================================
 */

/**
 * @description 1.12.2 and prior: Queries and returns all patient data to be available at login.
 *             After 1.12.2: Doesn't do anything anymore, but was kept to record 'Login' in PatientActivityLog.
 * @param requestObject The request object.
 * @returns {Promise<*|{Response: string}>} Resolves to login data for versions <= 1.12.2,
 *                                          or to a generic acknowledgement message otherwise.
 */
async function login(requestObject) {
    if (Version.versionLessOrEqual(requestObject.AppVersion, Version.version_1_12_2)) {
        let patientSerNum = await getSelfPatientSerNum(requestObject.UserID);
        let loginData = await getPatientTableFields(requestObject.UserID, patientSerNum, requestObject.Parameters.Fields, requestObject.Parameters);

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
 * @description For now, the only purpose of the logout request is to record a timestamp in PatientActivityLog (done separately in logPatientRequest).
 * @param requestObject The request object.
 * @returns {Promise<{Response: string}>} Resolves with a generic acknowledgement message.
 */
function logout(requestObject) {
    return Promise.resolve({Response: "Successful logout"});
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
    let patientSerNum = requestObject.TargetPatientID ? requestObject.TargetPatientID : await getSelfPatientSerNum(UserId);
    logger.log('verbose', `Identified request target as PatientSerNum = ${patientSerNum}`);

    if (!fields) throw {Response:'error', Reason:"Undefined 'Fields' in Refresh request"};
    if (!Array.isArray(fields)) fields = [fields];

    let rows = await getPatientTableFields(UserId, patientSerNum, fields, parameters);
    rows.Data = utility.resolveEmptyResponse(rows.Data);

    return rows;
}

/**
 * @description Retrieves a patient's MRNs (with their corresponding sites) based on their PatientSerNum.
 * @date 2021-02-26
 * @param patientSerNum
 * @returns {Promise<*>} Rows with the patient's MRN information (multiple MRNs).
 */
async function getMRNs(patientSerNum) {
    let rows = await runSqlQuery(queries.getMRNs(), [patientSerNum]);

    if (rows.length === 0) throw "No MRN found for PatientSerNum "+patientSerNum+" in Patient_Hospital_Identifier";
    else return rows;
}

/**
 * @description Set CheckinUsername for all checked-in appointments.
 * @date 2023-01-04
 * @param requestObject
 * @param appointmentSerNumArray
 */
async function setCheckInUsername(requestObject, appointmentSerNumArray) {
    await runSqlQuery(queries.setCheckInUsername(), [requestObject.UserID, [appointmentSerNumArray]]);
}

/**
 * getDocumentsContent
 * @desc fetches a document's content from DB
 * @param requestObject
 * @return {Promise}
 */
async function getDocumentsContent(requestObject) {
    let documentList = requestObject.Parameters;
    let patientSerNum = requestObject.TargetPatientID ? requestObject.TargetPatientID : await getSelfPatientSerNum(requestObject.UserID);
    logger.log('verbose', `Fetching document contents for DocumentSerNums ${JSON.stringify(documentList)}`);

    if (!Array.isArray(documentList)) throw 'Request parameter is not an array';
    let rows = await runSqlQuery(queries.getDocumentsContentQuery(), [[documentList], patientSerNum]);
    if (rows.length === 0) throw "Document not found";
    let documents = await LoadDocuments(rows);
    return {
        Response: 'success',
        Data: documents.length === 1 ? documents[0] : documents,
    };
}

/**
 * @description Updates a user account field to a new value.
 * @param {object} requestObject The request object.
 * @param {string} requestObject.UserEmail The user's email, used to find their self PatientSerNum.
 * @param {string} requestObject.UserID The user's Firebase UID.
 * @param {string} requestObject.Parameters.FieldToChange The name of the field to update.
 * @param {string} requestObject.Parameters.NewValue The field's new value.
 * @returns {Promise<{Response: string}>} Resolves if the field was successfully updated, or rejects with an error.
 */
async function updateAccountField(requestObject) {
    // Validate input
    const email = requestObject.UserEmail;
    const uid = requestObject.UserID;
    const field = requestObject.Parameters?.FieldToChange;
    const newValue = requestObject.Parameters?.NewValue;
    if (!email) throw `Missing value of 'UserEmail' parameter: ${email}`;
    if (!uid) throw `Missing value of 'UserID' parameter: ${uid}`;
    if (typeof field !== 'string' || !field) throw `Invalid type or missing value of 'FieldToChange' parameter: ${field}`;
    if (typeof newValue !== 'string' || !newValue) throw `Invalid type or missing value of 'NewValue' parameter: ${newValue}`;

    let patient = await getPatientFromEmail(email);

    if (field === 'Password') {
        // Hash the password before storing it
        const hashedPassword = utility.hash(newValue);

        await runSqlQuery(queries.setNewPassword(), [hashedPassword, uid]);
        delete requestObject.Parameters.NewValue;
    }
    else if (field === 'Language') {
        await runSqlQuery(queries.languageChange(), [newValue, patient.PatientSerNum]);
    }
    else throw `Invalid 'FieldToChange' parameter: ${field}`;
    return { Response: 'success' };
}

/**
 * @name inputFeedback
 * @description Manages feedback content for the app, sends feedback to pfp committee if directed there.
 * @param requestObject
 */
function inputFeedback(requestObject) {
    let r = Q.defer();
    let email = requestObject.UserEmail;
    if(!email) r.reject({Response:'error',Reason:`Invalid parameter email`});
    getPatientFromEmail(email).then((patient)=> {
		let feedback = requestObject.Parameters.FeedbackContent;
		let appRating = requestObject.Parameters.AppRating;
		let type = requestObject.Parameters.Type;
		let patientSerNum = patient.PatientSerNum;

        if((!type||!feedback)) r.reject({Response:'error',Reason:`Invalid parameter type`});
        feedback = feedback.replace(/[\u0100-\uffff]/g, match => `[u+${match.codePointAt(0).toString(16)}]`);
        runSqlQuery(queries.inputFeedback(),[patient.PatientSerNum, feedback, appRating])
            .then(()=>{
	            let replyTo = null;
	            let email;
                let subject;
	            // Determine if the feedback is for the app or patients committee
                //deprecated (Patients for Patients will be removed)
                if (type === 'pfp') {
                    email = "patients4patients.contact@gmail.com";
                    subject = "New Suggestion - Opal";
                    replyTo = email;
                } else if (type === 'research') {
                    email = config.FEEDBACK_EMAIL;
                    subject = "New Research Feedback - Opal - From PatientSerNum: " + patientSerNum;
                } else {
                    email = config.FEEDBACK_EMAIL;
                    subject = "New Feedback - Opal - From PatientSerNum: " + patientSerNum;
                }

                (new Mail()).sendMail(email, subject, feedback, replyTo);
	            r.resolve({Response:'success'});
            }).catch((err)=>{
                r.reject({Response:'error',Reason:err});
            });
    });
    return r.promise;
}

/**
 * @module sqlInterface
 * @name updateDeviceIdentifiers
 * @description Updates the device identifier for a particular user and a particular device.
 * @input {object} Object containing the device identifiers
 * @returns {Promise} Promise with success or failure.
 */
function updateDeviceIdentifier(requestObject, parameters) {
    let r = Q.defer();

    logger.log('debug', `in update device id with : ${JSON.stringify(requestObject)}`);

    let identifiers = parameters || requestObject.Parameters;
    let deviceType = null;
    let appVersion = requestObject.AppVersion;

    //Validation deviceType
    if (identifiers.deviceType === 'browser') {
        deviceType = 3;
    } else if ( identifiers.deviceType === 'iOS'){
        deviceType = 0;
    }else if ( identifiers.deviceType === 'Android'){
        deviceType = 1;
    }else{
        r.reject({Response:'error', Reason:'Incorrect device type'});
        return r.promise;
    }

    let email = requestObject.UserEmail;
    getPatientFromEmail(email).then(() => {
        runSqlQuery(queries.updateDeviceIdentifiers(),[requestObject.UserID, requestObject.DeviceId, identifiers.registrationId, deviceType, appVersion, identifiers.registrationId])
            .then(() => {
                logger.log('debug', 'successfully updated device identifiers');
                r.resolve({Response:'success'});
            }).catch((error) => {
                let errorMessage = 'Error updating device identifiers due to';
                logger.log('error', errorMessage, error);
                r.reject({Response:'error', Reason: `${errorMessage}: ${error}`});
            });
    }).catch((error) => {
        let errorMessage = 'Error getting patient fields due to';
        logger.log('error', errorMessage, error);
        r.reject({Response:'error', Reason: `${errorMessage}: ${error}`});
    });
    return r.promise;
}

function logActivity(requestObject) {
    logger.log('verbose', 'User Activity', {
        deviceID: requestObject.DeviceId,
        userID: requestObject.UserID,
        request: requestObject.Request,
        activity: requestObject.Parameters.Activity,
        activityDetails: requestObject.Parameters.ActivityDetails,
    });
    return Promise.resolve({Response:'success'});
}

/**
 * @name addToActivityLog
 * @desc Adding action to activity log
 * @param {OpalRequest}requestObject
 */
function addToActivityLog(requestObject) {
    let r = Q.defer();

    let {Request, UserID, DeviceId, AppVersion, TargetPatientID, Parameters} = requestObject;
    if (typeof Request === "undefined") Request = requestObject.type;
    if (typeof UserID === "undefined") UserID = requestObject.meta.UserID;
    if (typeof DeviceId === "undefined") DeviceId = requestObject.meta.DeviceId;
    if (typeof AppVersion === "undefined") AppVersion = requestObject.meta.AppVersion;
    if (typeof TargetPatientID === "undefined") TargetPatientID = requestObject.meta?.TargetPatientID;
    if (typeof Parameters === "undefined") Parameters = requestObject.params || requestObject.parameters;

    if (omitParametersFromLogs.hasOwnProperty(Request) && omitParametersFromLogs[Request](Parameters)) Parameters = 'OMITTED';
    else Parameters = Parameters === 'undefined' ? undefined : JSON.stringify(Parameters);

    // Ignore LogPatientAction to avoid double-logging --> Refer to table PatientActionLog
    if (Request !== "LogPatientAction") {
        runSqlQuery(queries.logActivity(),[Request, Parameters, TargetPatientID, UserID, DeviceId, AppVersion])
        .then(()=>{
            logger.log('verbose', "Success logging request of type: "+Request);
            r.resolve({Response:'success'});
        }).catch((err)=>{
            logger.log('error', "Error logging request of type: "+Request, err);
            r.reject({Response:'error', Reason:err});
        });
    }
    else {
        r.resolve({Response:'success', Reason:'Skip logging; already logged'});
    }
    return r.promise;
}

/**
 * getEncryption
 * @desc Gets user password for encrypting/decrypting to return security question
 * @param requestObject
 * @return {Promise}
 */
function getEncryption(requestObject) {
    return runSqlQuery(queries.userEncryption(),[requestObject.UserID, requestObject.DeviceId]);
}

/**
 * getPackageContents
 * @date 2018-11-15
 * @desc Gets and returns the contents of a specified package, at a single level of depth.
 *       For example, if the function is called to get the contents of Package 1, which includes a booklet and
 *       Package 2, the function will return an array containing the full contents of the booklet, and the identifying
 *       information of Package 2, not the full contents of Package 2. This function must be called again to get the
 *       contents of Package 2 (which itself may contain other packages).
 *
 * requestObject must include the following fields:
 * @param requestObject
 * @param requestObject.Parameters
 * @param requestObject.Parameters.EducationalMaterialControlSerNum The SerNum of the package for which to get
 *                                                                  the contents.
 * @returns {*}
 */
function getPackageContents(requestObject) {
    let r = Q.defer();
    // Check that the correct parameters are given.
    let {EducationalMaterialControlSerNum} = requestObject.Parameters;
    if(!EducationalMaterialControlSerNum) {
        r.reject({Response:'error',Reason:'Missing parameter EducationalMaterialControlSerNum for request EducationalPackageContents.'});
    }
    else{
        // If the correct parameters were given, get the package contents.
        let queryParameters = [EducationalMaterialControlSerNum];
        runSqlQuery(queries.getPackageContents(),queryParameters).then((rows)=>{

            // Done getting the package contents.
            // Now, the contents must be processed like any other educational material to attach the tables of contents.
            getEducationalMaterialTableOfContents(rows).then((processedRows)=>{
                r.resolve({Response:'success',Data:processedRows});

            }).catch((err)=>{
                let errorReason2 = 'Error attaching tables of contents to package materials.';
                logger.log('error', errorReason2, err);
                r.reject({Response:'error',Reason:errorReason2});
            });
        }).catch((err)=>{
            let errorReason1 = 'Error getting package contents from the database.';
            logger.log('error', errorReason1, err);
            r.reject({Response:'error',Reason:errorReason1});
        });
    }
    return r.promise;
}

/**
 * @name increaseSecurityAnswerAttempt
 * @description Increase security answer attempt by one
 * @param requestObject
 */
function increaseSecurityAnswerAttempt(requestObject) {
    return runSqlQuery(queries.increaseSecurityAnswerAttempt(),[requestObject.UserID, requestObject.DeviceId]);
}

/**
 * @name resetSecurityAnswerAttempt
 * @description Sets the security answer attempt to zero
 * @param requestObject
 */
function resetSecurityAnswerAttempt(requestObject) {
    return runSqlQuery(queries.resetSecurityAnswerAttempt(),[requestObject.UserID, requestObject.DeviceId]);
}

/**
 * @name setTimeoutSecurityAnswer
 * @description Sets up timeout for device with incorrect security answer
 * @param requestObject
 * @param timestamp
 */
function setTimeoutSecurityAnswer(requestObject, timestamp) {
    return runSqlQuery(queries.setTimeoutSecurityAnswer(),[new Date(timestamp), requestObject.UserID, requestObject.DeviceId]);
}

/**
 * @desc Gets and returns User and Patient fields used in security requests, such as password resets and verifying security answers.
 * @param {object} requestObject A security request object.
 * @return {Promise} Resolves to rows containing the user and patient's security information.
 */
function getUserPatientSecurityInfo(requestObject) {
    return runSqlQuery(queries.getUserPatientSecurityInfo(),[requestObject.UserID, requestObject.DeviceId]);
}

/**
 * setNewPassword
 * @desc updates user's password in DB
 * @param password
 * @param patientSerNum
 * @return {Promise}
 */
function setNewPassword(password, username) {
    return runSqlQuery(queries.setNewPassword(),[password, username]);
}

/**
 *@module sqlInterface
 *@name inputEducationalMaterialRating
 *@require queries
 *@description Inputs educational material rating
 *@parameter {string} patientSerNum SerNum in database for user that rated the material
 *@parameter {string} edumaterialSerNum serNum for educational material
 *@parameter {string} ratingValue value from 1 to 5 for educational material
 */
function inputEducationalMaterialRating(requestObject) {
    let r = Q.defer();
    let {EducationalMaterialControlSerNum, PatientSerNum, RatingValue} = requestObject.Parameters;
    if(!EducationalMaterialControlSerNum||!PatientSerNum||!RatingValue) {
        r.reject({Response:'error',Reason:'Invalid Parameters'});
    }

    runSqlQuery(queries.insertEducationalMaterialRatingQuery(),
        [EducationalMaterialControlSerNum, PatientSerNum, requestObject.UserID, RatingValue])
        .then(()=>{
            r.resolve({Response:'success'});
        }).catch((err)=>{
            r.reject({Response:'error',Reason:err});
        });
    return r.promise;
}

/**
 * @description Gets a user's self PatientSerNum based on their email.
 * @param {string} email The user's email address.
 * @return {Promise<{PatientSerNum: number}>} Resolves to an object containing the user's PatientSerNum.
 */
async function getPatientFromEmail(email) {
    let rows = await runSqlQuery(queries.getPatientFromEmail(), [email]);
    if (rows.length === 0) throw {
        Response: 'error',
        Reason: `Patient not found using email: ${email}`,
    };
    return rows[0];
}

/**
 * LoadDocuments
 * @desc Grabs file object to be loaded
 * @param rows
 * @return {Promise}
 */
function LoadDocuments(rows) {

    const defer = Q.defer();

    if (rows.length === 0) { return defer.resolve([]); }

    for (let key = 0; key < rows.length; key++) {

        // Get extension for filetype
        const n = rows[key].FinalFileName.lastIndexOf(".");
        rows[key].DocumentType= rows[key].FinalFileName.substring(n + 1, rows[key].FinalFileName.length);

        try{
            rows[key].Content=filesystem.readFileSync(config.DOCUMENTS_PATH + rows[key].FinalFileName,'base64');
            defer.resolve(rows)
        } catch(err) {
            if (err.code == "ENOENT"){
                defer.reject("No file found");
            }
            else {
                throw err;
            }
        }
    }
    return defer.promise;
}

/**
 * loadProfileImagePatient
 * @desc formats patient image to base64
 * @deprecated Along with the Patient requestMapping in sqlInterface.
 * @param rows
 * @return {Promise}
 */
function loadProfileImagePatient(rows){
    const deferred = Q.defer();

    if(rows[0]&&rows[0].ProfileImage && rows[0].ProfileImage!=='') {
        const buffer = new Buffer(rows[0].ProfileImage, 'hex');
        const base64Buffer = buffer.toString('base64');
        rows[0].DocumentType='jpg';
        rows[0].ProfileImage=base64Buffer;
        deferred.resolve(rows);
    }else{
        deferred.resolve(rows);
    }

    return deferred.promise;
}

/**
 * @description [Temporary compatibility with 1.12.2] The old app expects appointments to have a Resource attribute.
 *              Adds a mock Resource object to each appointment to prevent crashes at login using app version 1.12.2.
 * @deprecated
 * @param rows Appointment rows queried using requestMappings above.
 * @returns {*} A copy of the rows, each with an added Resource object attribute.
 */
async function supportLegacyAppointmentResource(rows) {
    return rows.map(row => {
        return {
            ...row,
            Resource: {
                LegacyCompatibility: 'Added for temporary compatibility with app version 1.12.2.',
            },
        }
    });
}

//Obtains educational material table of contents
function getEducationalMaterialTableOfContents(rows)
{
    var r = Q.defer();
    if(rows.length>0)
    {
        var array=[];
        for (var i = 0; i < rows.length; i++) {
            array.push(runSqlQuery(queries.patientEducationalMaterialContents(), [rows[i].EducationalMaterialControlSerNum]));
        }
        Q.all(array).then(function(results)
        {
            for (var i = 0; i < results.length; i++) {
                rows[i].TableContents=results[i];
            }
            r.resolve(rows);
        });
    }else{
        r.resolve(rows);
    }
    return r.promise;
}

/**
 * decodePostMessages
 * @desc this function decode the html for the strings of treatment team messages and announcements which contain html text
 * @param {array} rows
 * @returns {Promise}
 */
function decodePostMessages(rows){
    for (var i = 0; i < rows.length; i++) {
        let currentRow = rows[i];

        if (currentRow.hasOwnProperty('Body_EN') && currentRow.hasOwnProperty('Body_FR')) {
            currentRow.Body_EN = utility.htmlspecialchars_decode(currentRow.Body_EN);
            currentRow.Body_FR = utility.htmlspecialchars_decode(currentRow.Body_FR);
        }
    }

    return Promise.resolve(rows);
}

//Obtains the educational material table of contents and adds it to the pertinent materials
// Also adds educational material category string based on category ID
function getEducationTableOfContents(rows)
{
    let r = Q.defer();
    let indexes = [];
    let promises =[];
    for (let i = rows.length-1; i >= 0; i--) {
        if(!rows[i].URL_EN || typeof rows[i].URL_EN == 'undefined'|| rows[i].URL_EN.length === 0)
        {
            for (let j = rows.length-1; j >= 0; j--) {
                if(rows[j].EducationalMaterialSerNum == rows[i].EducationalMaterialSerNum && rows[j].EducationalMaterialControlSerNum !== rows[i].EducationalMaterialControlSerNum)
                {
                    indexes.push(j);
                }
            }
        }
    }
    //Delete
    for (let k = rows.length-1; k >= 0; k--) {
        if(indexes.indexOf(k) !== -1)
        {
            rows.splice(k,1);
        }
    }
    for (let l = 0; l < rows.length; l++) {
        promises.push(runSqlQuery(queries.patientEducationalMaterialContents(),[rows[l].EducationalMaterialControlSerNum] ));
    }
    Q.all(promises).then(function(results) {
            rows.forEach(row => {
                row.Category = eduMaterialConfig.EDUMATERIAL_CATEGORY_ID_MAP[row.EduCategoryId].toLowerCase();

                results.forEach(toc => {
                    if (toc.length > 0 && toc[0].ParentSerNum == row.EducationalMaterialControlSerNum) {
                        row.TableContents = toc;
                    }
                })
            });
            r.resolve(rows);
        }
    ).catch(function(error){r.reject(error);});
    return r.promise;
}

//Attachments for messages, not yet implemented to be added eventually
var LoadAttachments = function (rows ) {
    var messageCounter=0 ;
    var r = Q.defer();
    r.resolve(rows);
    return r.promise;

};

async function getSecurityQuestion(requestObject) {
    try {
        let apiResponse = await SecurityDjango.getRandomSecurityQuestionAnswer(requestObject.UserID);
        if (apiResponse.question === '' || apiResponse.answer === '') throw "API call returned a blank question or answer";

        await runSqlQuery(queries.cacheSecurityAnswerFromDjango(), [apiResponse.answer, requestObject.DeviceId, requestObject.UserID]);

        // Security question format read by the app has changed after 1.12.2
        if (Version.versionLessOrEqual(requestObject.AppVersion, Version.version_1_12_2)) return {
            // To maintain login for 1.12.2 and previous versions, return the one available question for either language
            Data: {
                securityQuestion: {
                    securityQuestion_EN: apiResponse.question,
                    securityQuestion_FR: apiResponse.question,
                }
            }
        };
        else return {
            Data: {
                securityQuestion: apiResponse.question,
            }
        }
    }
    catch (error) {
        let errMsg = "Error getting a security question from Django and caching it locally";
        logger.log('error', errMsg, error);
        throw new Error(errMsg);
    }
}

function setTrusted(requestObject) {
    let trusted = requestObject?.Parameters?.Trusted === "true" ? 1 : 0;
    return runSqlQuery(queries.setTrusted(),[trusted, requestObject.UserID, requestObject.DeviceId]);
}

/**
 * @desc Gets the PatientSerNum associated with the given user (by Firebase userId).
 * @param userId The Firebase userId of the user.
 * @returns {Promise<*>} Resolves with the PatientSerNum of the user, or rejects with an error if not found.
 */
async function getSelfPatientSerNum(userId) {
    return (await Patient.getPatientByUsername(userId)).patientSerNum;
}

export default {
    omitParametersFromLogs,
    getSqlApiMappings,
    updateReadStatus,
    logPatientAction,
    getStudies,
    getStudyQuestionnaires,
    studyUpdateStatus,
    checkIn,
    login,
    logout,
    refresh,
    getDocumentsContent,
    updateAccountField,
    inputFeedback,
    updateDeviceIdentifier,
    logActivity,
    addToActivityLog,
    getEncryption,
    getPackageContents,
    increaseSecurityAnswerAttempt,
    resetSecurityAnswerAttempt,
    setTimeoutSecurityAnswer,
    getUserPatientSecurityInfo,
    setNewPassword,
    inputEducationalMaterialRating,
    getSecurityQuestion,
    setTrusted,
}
