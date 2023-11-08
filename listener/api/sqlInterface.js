const filesystem        = require('fs');
const Q                 = require('q');
const queries           = require('./../sql/queries.js');
const config            = require('./../config-adaptor');
const requestUtility    = require("../utility/request-utility");
const Mail              = require('./../mailer/mailer.js');
const utility           = require('./../utility/utility');
const logger            = require('./../logs/logger');
const {OpalSQLQueryRunner} = require("../sql/opal-sql-query-runner");
const testResults       = require("./modules/test-results");
const questionnaires    = require("./modules/questionnaires");
const { Patient } = require('./modules/patient/patient');
const eduMaterialConfig = require('./../educational-material/eduMaterialConfig.json');
const studiesConfig     = require('./../studies/studiesConfig.json');
const SecurityDjango = require('./../security/securityDjango');
const { Version } = require('../../src/utility/version');

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
 * Deprecated: {Doctors: {sql, processFunction: loadImageDoctor, numberOfLastUpdated: number}, Tasks: {sql, numberOfLastUpdated: number}}
 */
const requestMappings =
    {
        /**
         * Deprecated: 'Patient'
         */
        'Patient': {
            sql: queries.patientTableFields(),
            processFunction: loadProfileImagePatient,
            numberOfLastUpdated: 0
        },
        'Documents': {
            sql: queries.patientDocumentsAll(),
            sqlSingleItem: queries.patientDocumentsOne(),
            numberOfLastUpdated: 2,
            table: 'Document',
            serNum: 'DocumentSerNum',
            needUserId: true,
        },
        /**
         * Deprecated: 'Doctors'
         */
        'Doctors': {
            sql: queries.patientDoctorTableFields(),
            processFunction: loadImageDoctor,
            numberOfLastUpdated: 2
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
            numberOfLastUpdated: 5,
            processFunction: combineResources,
            table: 'Appointment',
            serNum: 'AppointmentSerNum',
            needUserId: true
        },
        'Notifications': {
            sql: queries.patientNotificationsTableFields(),
            numberOfLastUpdated: 2,
            table: 'Notification',
            serNum: 'NotificationSerNum',
            needUserId: true
        },
        /**
         * Deprecated: 'Tasks'
         */
        'Tasks': {
            sql: queries.patientTasksTableFields(),
            numberOfLastUpdated: 2
        },
        'TxTeamMessages': {
            sql: queries.patientTxTeamMessagesAll(),
            sqlSingleItem: queries.patientTxTeamMessagesOne(),
            processFunction: decodePostMessages,
            numberOfLastUpdated: 2,
            table: 'TxTeamMessage',
            serNum: 'TxTeamMessageSerNum',
            needUserId: true,
        },
        'EducationalMaterial': {
            sql: queries.patientEducationalMaterialAll(),
            sqlSingleItem: queries.patientEducationalMaterialOne(),
            processFunction: getEducationTableOfContents,
            numberOfLastUpdated: 3,
            table: 'EducationalMaterial',
            serNum: 'EducationalMaterialSerNum',
            needUserId: true,
        },
        'Announcements': {
            sql: queries.patientAnnouncementsAll(),
            sqlSingleItem: queries.patientAnnouncementsOne(),
            processFunction: decodePostMessages,
            numberOfLastUpdated: 2,
            table: 'Announcement',
            serNum: 'AnnouncementSerNum',
            needUserId: true
        },
        'PatientTestDates': {
            module: testResults,
            processFunction: result => result.data.collectedDates
        },
        'PatientTestTypes': {
            module: testResults,
            processFunction: result => result.data.testTypes
        },
        'QuestionnaireList': {
            module: questionnaires,
            moduleSingleItem: questionnaires,
            processFunction: result => result.data.questionnaireList
        },
        'patientStudy': {
            table: 'patientStudy',
            serNum: 'ID'
        }
    };

/**
 * @desc List of request types for which to omit parameters in PatientActivityLog.
 *       This is done to avoid logging sensitive information, such as passwords or security answers.
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
exports.getSqlApiMappings = function() {
    return requestMappings;
};

/**
 * runSqlQuery function runs query, its kept due to the many references
 * @desc runs inputted query against SQL mapping by grabbing an available connection from connection pool
 * @param query
 * @param parameters
 * @param processRawFunction
 * @return {Promise}
 */
exports.runSqlQuery = OpalSQLQueryRunner.run;

/**
 * @desc Fetches and returns data for the given patient in an array of categories from requestMappings.
 * @param {string} userId Firebase userId making the request.
 * @param patientSerNum The PatientSerNum of the patient.
 * @param {string[]} arrayTables The list of categories of data to fetch. Should be keys in requestMappings.
 * @param [timestamp] Optional date/time; if provided, only items with 'LastUpdated' after this time are returned.
 *                    If not provided, all data is returned (a default value of 0 is used to query the database).
 * @param {string} purpose Optional parameter that is used to filter questionnaires and educational materials by purpose. By default is set to "clinical" to support the old versions of the app.
 * @return {Promise}
 */
exports.getPatientTableFields = async function(
    userId,
    patientSerNum,
    arrayTables,
    timestamp,
    purpose = 'clinical'
) {
    timestamp = timestamp || 0;

    // Validate the arrayTables
    let invalidCategory = arrayTables.find(e => !requestMappings.hasOwnProperty(e));
    if (invalidCategory) throw {Response: 'error', Reason: `Incorrect refresh parameter: ${invalidCategory}`};

    logger.log('verbose', `Processing select requests in the following categories: ${JSON.stringify(arrayTables)}`);
    let response = await Promise.all(arrayTables.map(category => processSelectRequest(userId, category, patientSerNum, timestamp, purpose)));
    // Arrange the return object with categories as keys and each corresponding response as a value
    let responseMapping = Object.fromEntries(arrayTables.map((category, i) => [category, response[i]]));
    return {
        Data: responseMapping,
        Response: 'success',
    };
};

/**
 * @desc Processes a request for data in one of the categories of requestMappings.
 *       If available, runs the category's 'processFunction' on the result before returning it.
 * @param {string} userId Firebase userId making the request.
 * @param {string} category The requested data category. Must be a key in requestMappings.
 * @param patientSerNum The patient's PatientSerNum.
 * @param [timestamp] Optional date/time; if provided, only items with 'LastUpdated' after this time are returned.
 * @param {string} purpose Optional parameter that is used to filter questionnaires and educational materials by purpose. By default is set to "clinical" to support the old versions of the app.
 * @returns {Promise<*>}
 */
async function processSelectRequest(userId, category, patientSerNum, timestamp, purpose = 'clinical') {
    const mapping = requestMappings[category];
    let date = timestamp ? new Date(Number(timestamp)) : new Date(0);

    // Request mappings with a 'module' attribute use request handlers in the `listener/api/modules` folder
    if (mapping.hasOwnProperty('module')) {
        let result = await mapping.module[category].handleRequest({
            meta: {
                TargetPatientID: patientSerNum,
                UserID: userId,
            },
            params: {
                Date: timestamp,
                purpose: purpose
            },
        });
        return mapping.processFunction ? mapping.processFunction(result) : result;
    }
    else if (mapping.hasOwnProperty('sql')) {
        let paramArray = mapping.needUserId ? [`"${userId}"`, patientSerNum] : [patientSerNum];
        paramArray = utility.addSeveralToArray(paramArray, date, mapping.numberOfLastUpdated);
        return await exports.runSqlQuery(mapping.sql, paramArray, mapping.processFunction);
    }
    else throw new Error(`requestMapping for '${category}' does not have the necessary properties to complete the request`);
}

/**
 * updateReadStatus
 * @desc Update read status for a table
 * @param userId
 * @param parameters
 * @return {Promise}
 */
exports.updateReadStatus=function(userId, parameters)
{
    let r = Q.defer();

    let table, serNum;

    if(parameters && parameters.Field && parameters.Id && requestMappings.hasOwnProperty(parameters.Field) ) {
        ({table, serNum} = requestMappings[parameters.Field]);
        exports.runSqlQuery(queries.updateReadStatus(),[table, userId, table, serNum, parameters.Id]).then(()=>{
            r.resolve({Response:'success'});
        }).catch((err)=>{
            r.reject({Response:'error', Reason:err});
        });

    }else {
        r.reject({Response: 'error', Reason: 'Invalid read status field'});
    }
    return r.promise;
};

/**
 * logPatientAction
 * @author Stacey Beard, based on work by Tongyou (Eason) Yang
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
exports.logPatientAction = function(requestObject){

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
                exports.runSqlQuery(queries.logPatientAction(),queryParameters).then(()=>{

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
                logger.log('error', errorReason2, err);
                r.reject({Response:'error',Reason:errorReason2});
            }
        }).catch((err) => {
            let errorReason1 = 'Error looking up the user\'s PatientSerNum in the database.';
            logger.log('error', errorReason1, err);
            r.reject({Response:'error',Reason:errorReason1});
        });
    }
    return r.promise;
};

/**
 * @name getStudies
 * @desc Gets patient studies based on UserID
 * @param {object} requestObject
 * @returns {promise}
 */
exports.getStudies = async function(requestObject) {
    try {
        let rows = await exports.runSqlQuery(queries.patientStudyTableFields(), [requestObject.UserID]);

        rows.forEach(
            (row, id, arr) => arr[id].consentStatus = studiesConfig.STUDY_CONSENT_STATUS_MAP[arr[id].consentStatus]
        );

        let data = {studies: rows};

        return {Response: 'success', Data: data};
    }
    catch (error) { throw {Response: 'error', Reason: error}; }
};

/**
 * @name getStudyQuestionnaires
 * @desc Gets study questionnaires based on studyID
 * @param {object} requestObject
 * @returns {promise}
 */
exports.getStudyQuestionnaires = async function(requestObject) {
    try {
        let rows = await exports.runSqlQuery(
            queries.getStudyQuestionnairesQuery(),
            [requestObject.Parameters.studyID]
        );

        return {Response: 'success', Data: rows};
    }
    catch (error) { throw {Response: 'error', Reason: error}; }
};


/**
 * @name studyUpdateStatus
 * @desc Update consent status for a study.
 * @param {object} requestObject
 * @return {Promise}
 */
exports.studyUpdateStatus = async function(requestObject) {
    try {
        let parameters = requestObject.Parameters;
        if (parameters && parameters.questionnaire_id && parameters.status) {
            // get number corresponding to consent status string
            let statusNumber = Object.keys(
                studiesConfig.STUDY_CONSENT_STATUS_MAP
            ).find(
                key => studiesConfig.STUDY_CONSENT_STATUS_MAP[key] === parameters.status
            );

            await exports.runSqlQuery(
                queries.updateConsentStatus(),
                [statusNumber, parameters.questionnaire_id, requestObject.UserID]
            );

            return {Response: 'success'};
        } else {
            throw {Response: 'error', Reason: 'Invalid parameters'};
        }
    }
    catch (error) { throw {Response: 'error', Reason: error}; }
};

/**
 * CHECKIN FUNCTIONALITY
 * ============================================================
 */

/**
 * checkIn
 * @description Checks the patient into their appointments for the day via the OIE.
 * @param requestObject
 * @return {Promise}
 */
exports.checkIn = async function (requestObject) {
    try {
        // If there's a TargetPatientID, use it, otherwise get data for self
        let patientSerNum = requestObject.TargetPatientID ? requestObject.TargetPatientID : await getSelfPatientSerNum(requestObject.UserID);

        if (await hasAlreadyAttemptedCheckin(patientSerNum) === false) {
            let success = false;
            let lastError;

            // Get the patient's MRNs (used in the check-in call to ORMS)
            let mrnList = await getMRNs(patientSerNum);

            // Attempt a check-in on each of the patient's MRNs on a loop until one of the calls is successful
            for (let i = 0; i < mrnList.length; i++) {
                let mrnObj = mrnList[i];
                let mrn = mrnObj.MRN;
                let mrnSite = mrnObj.Hospital_Identifier_Type_Code;

                try {
                    // Check into the patient's appointments via a call to the OIE
                    await checkIntoOIE(mrn, mrnSite);
                    logger.log("verbose", `Success checking in PatientSerNum = ${patientSerNum} using MRN = ${mrn} (site = ${mrnSite})`);
                    success = true;
                    break;
                }
                catch (error) {
                    logger.log("verbose", `Failed to check in PatientSerNum = ${patientSerNum} using MRN = ${mrn} (site = ${mrnSite}); error: ${error}`);
                    lastError = error;
                }
            }
            // Check whether the check-in call succeeded, or all attempts failed
            // On a success, return all checked-in appointments to the app
            if (success) {
                // TODO: once the check-in race condition is fixed, delete the function getCheckedInAppointmentsLoop and change this line to call getCheckedInAppointments.
                let rows = await getCheckedInAppointmentsLoop(patientSerNum);
                if (rows.Data && rows.Data.length === 0) throw 'Appointments were not marked as checked-in for this patient in OpalDB';

                logger.log("verbose", `Today's checked in appointments for PatientSerNum = ${patientSerNum}`, rows);
                let appSerNums = [];
                rows['Data'].forEach(function(serNum){
                    appSerNums.push(serNum['AppointmentSerNum']);
                });
                // Set CheckinUsername for all checked-in appointments
                await setCheckInUsername(requestObject, appSerNums);
                return rows;
            }
            else throw lastError;
        }
        else return [];
    }
    catch (error) { throw {Response: 'error', Reason: error}; }
};

/**
 * @description Calls the OIE to check the patient in on external systems (e.g. Aria, Medivisit).
 * @param {string} mrn One of the patient's medical record numbers.
 * @param {string} mrnSite The site to which the MRN belongs.
 * @returns {Promise<void>} Resolves if check-in succeeds, otherwise rejects with an error.
 */
async function checkIntoOIE(mrn, mrnSite) {

    let options = {
        json: true,
        body: {
            "mrn": mrn,
            "site": mrnSite,
            "room": config.CHECKIN_ROOM,
        },
    };

    await requestUtility.request("post", config.CHECKIN_URL, options);
}

/**
 * Queries the database to see if any patient push notifications exist for the user today, hence whether or not they have attempted to check in already
 * @param patientSerNum
 * @returns {Promise}
 */
function hasAlreadyAttemptedCheckin(patientSerNum){
    return new Promise((resolve, reject) => {
        if(!patientSerNum) reject("No Patient SerNum Provided");
        else {
            exports.runSqlQuery(queries.getPatientCheckinPushNotifications(), [patientSerNum]).then((rows) => {
                if (rows.length === 0) resolve(false);
                // YM 2018-05-25 - Temporary putting as false for now to bypass the checking of notification table.
                //                 Technically, it should be checking the appointment table.
                else resolve(false);
            }).catch((err) => {
                reject({Response: 'error', Reason: err});
            })
        }
    });
}

exports.checkCheckin = hasAlreadyAttemptedCheckin;

/**
 * Gets and returns all of a patients appointments on today's date
 * @param patientSerNum
 * @return {Promise}
 */
function getCheckedInAppointments(patientSerNum){
    return new Promise((resolve, reject) => {
        exports.runSqlQuery(queries.getTodaysCheckedInAppointments(), [patientSerNum])
            .then(rows => resolve({Response:'success', Data: rows}))
            .catch(err => reject({Response: 'error', Reason: err}));
    })
}

/**
 * @description This function is a TEMPORARY patch, and does not represent the right way of doing things.
 *              Until the check-in race condition is properly fixed, this patch will help restore check-in service in prod.
 *              Race condition: "await checkIntoOIE" resolves as a success BEFORE the check-in status is actually updated in OpalDB,
 *              i.e. before the check-in is fully completed. This causes getCheckedInAppointments to return [],
 *              even upon a successful checkin via the OIE, causing an error in the listener.
 *
 *              This function checks the database once per second, until it detects that check-in was completed,
 *              up to a maximum attempt limit. This should alleviate the race condition by forcing the listener
 *              to wait a bit for the OIE call to fully complete. If check-in has not completed by the time limit,
 *              then the last faulty result is returned. Once the race condition is fixed, this function should be deleted.
 *
 *              Patch requested by Yick Mo.
 * @param patientSerNum The PatientSerNum of the patient being checked in.
 */
async function getCheckedInAppointmentsLoop(patientSerNum) {
    // Source: https://stackoverflow.com/questions/14249506/how-can-i-wait-in-node-js-javascript-l-need-to-pause-for-a-period-of-time
    const waitOneSecond = () => new Promise(resolve => setTimeout(resolve, 1000));
    const maxNumberOfSeconds = 15;
    logger.log('verbose', `Waiting for check-in status to be updated in OpalDB for PatientSerNum = ${patientSerNum}`);

    let checkedInAppointments;
    for (let i = 0; i < maxNumberOfSeconds; i++) {
        await waitOneSecond();
        checkedInAppointments = await getCheckedInAppointments(patientSerNum);
        if (checkedInAppointments.Data && checkedInAppointments.Data.length !== 0) {
            logger.log('verbose', `Check-in status update was detected in OpalDB for PatientSerNum = ${patientSerNum}`, checkedInAppointments);
            return checkedInAppointments;
        }
        logger.log('verbose', `Check-in status has not yet been updated in OpalDB after ${i+1} ${i+1===1 ? 'second' : 'seconds'} for PatientSerNum = ${patientSerNum}`);
    }
    logger.log('verbose', `Check-in timeout of ${maxNumberOfSeconds} seconds reached for PatientSerNum = ${patientSerNum}`, checkedInAppointments);
    return checkedInAppointments;
}

/**
 * ============================================================
 */

/**
 * @description Retrieves a patient's MRNs (with their corresponding sites) based on their PatientSerNum.
 * @author Stacey Beard
 * @date 2021-02-26
 * @param patientSerNum
 * @returns {Promise<*>} Rows with the patient's MRN information (multiple MRNs).
 */
async function getMRNs(patientSerNum) {
    let rows = await exports.runSqlQuery(queries.getMRNs(), [patientSerNum]);

    if (rows.length === 0) throw "No MRN found for PatientSerNum "+patientSerNum+" in Patient_Hospital_Identifier";
    else return rows;
}

/**
 * @description Set CheckinUsername for all checked-in appointments.
 * @author Shifeng Chen
 * @date 2023-01-04
 * @param requestObject
 * @param appointmentSerNumArray
 */
async function setCheckInUsername(requestObject, appointmentSerNumArray) {
    await exports.runSqlQuery(queries.setCheckInUsername(), [requestObject.UserID, [appointmentSerNumArray]]);
}

/**
 * getDocumentsContent
 * @desc fetches a document's content from DB
 * @param requestObject
 * @return {Promise}
 */
exports.getDocumentsContent = async function(requestObject) {
    let documentList = requestObject.Parameters;
    let patientSerNum = requestObject.TargetPatientID ? requestObject.TargetPatientID : await getSelfPatientSerNum(requestObject.UserID);
    logger.log('verbose', `Fetching document contents for DocumentSerNums ${JSON.stringify(documentList)}`);

    if (!Array.isArray(documentList)) throw 'Request parameter is not an array';
    let rows = await exports.runSqlQuery(queries.getDocumentsContentQuery(), [[documentList], patientSerNum]);
    if (rows.length === 0) throw "Document not found";
    let documents = await LoadDocuments(rows);
    return {
        Response: 'success',
        Data: documents.length === 1 ? documents[0] : documents,
    };
};

/**
 * @name updateAccountField
 * @description Updates the fields in the patient table
 * @param requestObject
 */
exports.updateAccountField=function(requestObject) {
    let r = Q.defer();

    let email = requestObject.UserEmail;
    if(!email) r.reject({Response:'error',Reason:`Invalid parameter email`}); //Check for valid email
    getPatientFromEmail(email).then(function(patient) {
        //Valid fields
        let validFields = ['Email', 'TelNum', 'Language'];
        let field = requestObject.Parameters.FieldToChange;
        let newValue = requestObject.Parameters.NewValue;
        if ( !field || !newValue || typeof field !== 'string' || typeof newValue !== 'string')
            r.resolve({Response:'error',Reason:'Invalid Parameters'});
        if(field === 'Password') {
            //Hash the password before storing
            let hashedPassword = utility.hash(newValue);
            //Update database
            exports.runSqlQuery(queries.setNewPassword(), [hashedPassword, requestObject.UserID])
                .then(()=>{
                    delete requestObject.Parameters.NewValue;
                    r.resolve({Response:'success'});
                }).catch((err)=>{
	                r.reject({Response:'error',Reason:err});
                });
            //If not a password field update
        }else if(validFields.includes(field)){
            exports.runSqlQuery(queries.accountChange(), [field, newValue, patient.PatientSerNum])
                .then(()=>{
                    r.resolve({Response:'success'});
                }).catch((err)=>{
                    r.reject({Response:'error',Reason:err});
                });
        }
    });
    return r.promise;
};

/**
 * @name inputFeedback
 * @description Manages feedback content for the app, sends feedback to pfp committee if directed there.
 * @param requestObject
 */
exports.inputFeedback = function(requestObject) {
    let r = Q.defer();
    let email = requestObject.UserEmail;
    if(!email) r.reject({Response:'error',Reason:`Invalid parameter email`});
    getPatientFromEmail(email).then((patient)=> {
		let feedback = requestObject.Parameters.FeedbackContent;
		let appRating = requestObject.Parameters.AppRating;
		let type = requestObject.Parameters.Type;
		let patientSerNum = patient.PatientSerNum;

        if((!type||!feedback)) r.reject({Response:'error',Reason:`Invalid parameter type`});
        exports.runSqlQuery(queries.inputFeedback(),[patient.PatientSerNum, feedback, appRating])
            .then(()=>{
	            let replyTo = null;
	            let email;
                let subject;
	            // Determine if the feedback is for the app or patients committee
                //deprecated (Patients for Patients will be removed)
	            if (type === 'pfp'){
		            email = "patients4patients.contact@gmail.com";
		            subject = "New Suggestion - Opal";
		            replyTo = email;
	            } else {
		            email = "opal@muhc.mcgill.ca";
		            subject = "New Feedback - Opal - From PatientSerNum: " + patientSerNum;
	            }
                (new Mail()).sendMail(email, subject, feedback, replyTo);
	            r.resolve({Response:'success'});
            }).catch((err)=>{
                r.reject({Response:'error',Reason:err});
            });
    });
    return r.promise;
};

/**
 * @module sqlInterface
 * @name updateDeviceIdentifiers
 * @description Updates the device identifier for a particular user and a particular device.
 * @input {object} Object containing the device identifiers
 * @returns {promise} Promise with success or failure.
 */
exports.updateDeviceIdentifier = function(requestObject, parameters) {

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
        exports.runSqlQuery(queries.updateDeviceIdentifiers(),[requestObject.UserID, requestObject.DeviceId, identifiers.registrationId, deviceType, appVersion, identifiers.registrationId])
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
};

/**
 * @name addToActivityLog
 * @desc Adding action to activity log
 * @param {OpalRequest}requestObject
 */
exports.addToActivityLog=function(requestObject)
{
    let r = Q.defer();

    let {Request, UserID, DeviceId, AppVersion, TargetPatientID, Parameters} = requestObject;

    if (typeof Request === "undefined") Request = requestObject.type;
    if (typeof UserID === "undefined") UserID = requestObject.meta.UserID;
    if (typeof DeviceId === "undefined") DeviceId = requestObject.meta.DeviceId;
    if (typeof AppVersion === "undefined") AppVersion = requestObject.meta.AppVersion;
    if (typeof TargetPatientID === "undefined") TargetPatientID = requestObject.meta?.TargetPatientID;
    if (typeof Parameters === "undefined") Parameters = requestObject.params || requestObject.parameters;

    if (omitParametersFromLogs.hasOwnProperty(Request) && omitParametersFromLogs[Request](Parameters)) Parameters = 'OMITTED';
    else Parameters = Parameters === 'undefined' ? null : JSON.stringify(Parameters);

    // Ignore LogPatientAction to avoid double-logging --> Refer to table PatientActionLog
    if (Request !== "LogPatientAction") {
        exports.runSqlQuery(queries.logActivity(),[Request, Parameters, TargetPatientID, UserID, DeviceId, AppVersion])
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
};

/**
 * getEncryption
 * @desc Gets user password for encrypting/decrypting to return security question
 * @param requestObject
 * @return {Promise}
 */
exports.getEncryption=function(requestObject)
{
    return exports.runSqlQuery(queries.userEncryption(),[requestObject.UserID, requestObject.DeviceId]);
};

/**
 * getPackageContents
 * @author Stacey Beard
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
exports.getPackageContents = function(requestObject){
    let r = Q.defer();
    // Check that the correct parameters are given.
    let {EducationalMaterialControlSerNum} = requestObject.Parameters;
    if(!EducationalMaterialControlSerNum) {
        r.reject({Response:'error',Reason:'Missing parameter EducationalMaterialControlSerNum for request EducationalPackageContents.'});
    }
    else{
        // If the correct parameters were given, get the package contents.
        let queryParameters = [EducationalMaterialControlSerNum];
        exports.runSqlQuery(queries.getPackageContents(),queryParameters).then((rows)=>{

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
};

/**
 * @name increaseSecurityAnswerAttempt
 * @description Increase security answer attempt by one
 * @param requestObject
 */
exports.increaseSecurityAnswerAttempt = function(requestObject) {
    return exports.runSqlQuery(queries.increaseSecurityAnswerAttempt(),[requestObject.UserID, requestObject.DeviceId]);
};

/**
 * @name resetSecurityAnswerAttempt
 * @description Sets the security answer attempt to zero
 * @param requestObject
 */
exports.resetSecurityAnswerAttempt = function(requestObject) {
    return exports.runSqlQuery(queries.resetSecurityAnswerAttempt(),[requestObject.UserID, requestObject.DeviceId]);
};

/**
 * @name setTimeoutSecurityAnswer
 * @description Sets up timeout for device with incorrect security answer
 * @param requestObject
 * @param timestamp
 */
exports.setTimeoutSecurityAnswer = function(requestObject, timestamp) {
    return exports.runSqlQuery(queries.setTimeoutSecurityAnswer(),[new Date(timestamp), requestObject.UserID, requestObject.DeviceId]);
};

/**
 * @desc Gets and returns User and Patient fields used in security requests, such as password resets and verifying security answers.
 * @param {object} requestObject A security request object.
 * @return {Promise} Resolves to rows containing the user and patient's security information.
 */
exports.getUserPatientSecurityInfo = requestObject => {
    return exports.runSqlQuery(queries.getUserPatientSecurityInfo(),[requestObject.UserID, requestObject.DeviceId]);
};

/**
 * setNewPassword
 * @desc updates user's password in DB
 * @param password
 * @param patientSerNum
 * @return {Promise}
 */
exports.setNewPassword = function(password, username) {
    return exports.runSqlQuery(queries.setNewPassword(),[password, username]);
};

/**
 *@module sqlInterface
 *@name inputEducationalMaterialRating
 *@require queries
 *@descrption Inputs educational material rating
 *@parameter {string} patientSerNum SerNum in database for user that rated the material
 *@parameter {string} edumaterialSerNum serNum for educational material
 *@parameter {string} ratingValue value from 1 to 5 for educational material
 */
exports.inputEducationalMaterialRating = function(requestObject)
{
    let r = Q.defer();
    let {EducationalMaterialControlSerNum, PatientSerNum, RatingValue} = requestObject.Parameters;
    if(!EducationalMaterialControlSerNum||!PatientSerNum||!RatingValue) {
        r.reject({Response:'error',Reason:'Invalid Parameters'});
    }

    exports.runSqlQuery(queries.insertEducationalMaterialRatingQuery(),
        [EducationalMaterialControlSerNum, PatientSerNum, requestObject.UserID, RatingValue])
        .then(()=>{
            r.resolve({Response:'success'});
        }).catch((err)=>{
            r.reject({Response:'error',Reason:err});
        });
    return r.promise;
};

/**
 * getPatientFromEmail
 * @desc gets patient information based on inputted email
 * @param email
 * @return {Promise}
 */
function getPatientFromEmail(email) {
    let r = Q.defer();
    exports.runSqlQuery(queries.getPatientFromEmail(),[email])
        .then((rows)=>{
            if(rows.length === 0) r.reject({Response:'error',Reason:"No User match in DB"});
            r.resolve(rows[0]);
        }).catch((err)=>{
            r.reject(err);
        });
    return r.promise;
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
 * loadImageDoctor
 * @deprecated
 * @desc loads a doctor's image fetched from DB
 * @param rows
 * @return {Promise}
 */
function loadImageDoctor(rows){
    const deferred = Q.defer();
    for (const key in rows){
        if((typeof rows[key].ProfileImage !=="undefined" )&&rows[key].ProfileImage){
            const n = rows[key].ProfileImage.lastIndexOf(".");
            rows[key].DocumentType=rows[key].ProfileImage.substring(n + 1, rows[key].ProfileImage.length);
			/* 2019-02-27 YM : Try to load the image file and if no image then return empty image string */
			try {
				rows[key].ProfileImage=filesystem.readFileSync(config.DOCTOR_PATH + rows[key].ProfileImage,'base64' );
			} catch(err) {
				rows[key].ProfileImage= '';
			}

        }
    }
    deferred.resolve(rows);
    return deferred.promise;
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

//Obtains educational material table of contents
function getEducationalMaterialTableOfContents(rows)
{
    var r = Q.defer();
    if(rows.length>0)
    {
        var array=[];
        for (var i = 0; i < rows.length; i++) {
            array.push(exports.runSqlQuery(queries.patientEducationalMaterialContents(), [rows[i].EducationalMaterialControlSerNum]));
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
        promises.push(exports.runSqlQuery(queries.patientEducationalMaterialContents(),[rows[l].EducationalMaterialControlSerNum] ));
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

/**
 * @module sqlInterface
 * @name combineResources
 * @method combineResources
 * @parameters {void}
 * @description Modifies all the appointments for the user to only obtain
 */
function combineResources(rows)
{
    var r = Q.defer();
    var resource = {};
    var index = 0;
    if(rows.length>0)
    {
        // ResourceType is set to 'Unknown' if it is empty to prevent a Firebase error due to an empty key. -SB
        const resourceType1 = !rows[rows.length-1].ResourceType || rows[rows.length-1].ResourceType === ""
                            ? "Unknown"
                            : rows[rows.length-1].ResourceType;
        resource[resourceType1] = rows[rows.length-1].ResourceName;

        for (var i=rows.length-2;i>=0;i--) {

            // ResourceType is set to 'Unknown' if it is empty to prevent a Firebase error due to an empty key. -SB
            const resourceType2 = !rows[i].ResourceType || rows[i].ResourceType === ""
                                ? "Unknown"
                                : rows[i].ResourceType;
            if(rows[i].AppointmentSerNum == rows[i+1].AppointmentSerNum)
            {
                resource[resourceType2] = rows[i].ResourceName;
                rows.splice(i+1,1);
            }else{
                var resourceObject={};
                for (var key in resource) {
                    resourceObject[key] = resource[key];
                }
                rows[i+1].Resource = resourceObject;
                resource = {};
                resource[resourceType2] = rows[i].ResourceName;
                delete rows[i+1].ResourceName;
                delete rows[i+1].ResourceType;
            }
        }
        delete rows[0].ResourceName;
        delete rows[0].ResourceType;
        rows[0].Resource = resource;

    }
    r.resolve(rows);
    return r.promise;
}

exports.getSecurityQuestion = async function (requestObject) {
    try {
        let apiResponse = await SecurityDjango.getRandomSecurityQuestionAnswer(requestObject.UserID);
        if (apiResponse.question === '' || apiResponse.answer === '') throw "API call returned a blank question or answer";

        await exports.runSqlQuery(queries.cacheSecurityAnswerFromDjango(), [apiResponse.answer, requestObject.DeviceId, requestObject.UserID]);

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
};

exports.setTrusted = function(requestObject)
{
    let trusted = requestObject?.Parameters?.Trusted === "true" ? 1 : 0;
    return exports.runSqlQuery(queries.setTrusted(),[trusted, requestObject.UserID, requestObject.DeviceId]);
};

/**
 * NOTIFICATIONS FUNCTIONALITY
 * ========================================================================
 */

/**
 * Returns a promise containing all new notifications
 * @deprecated Since QSCCD-125. This function provides duplicate functionality to 'Notifications' in requestMappings.
 * @param {object} requestObject the request
 * @returns {Promise} Returns a promise that contains the notification data
 */
exports.getNewNotifications = function(requestObject){
    let r = Q.defer();

    let lastUpdated = new Date(Number(requestObject.Parameters.LastUpdated));

    exports.runSqlQuery(queries.getNewNotifications(), [requestObject.UserID, requestObject.UserID, lastUpdated, lastUpdated])
        .then(rows => {
            if(rows.length > 0){
                assocNotificationsWithItems(rows, requestObject)
                    .then(tuples => r.resolve({Data:tuples}))
                    .catch(err => r.reject(err))
            } else r.resolve({Data: rows});
        })
        .catch(error => {
            r.reject(error);
        });

    return r.promise
};

/**
 * Takes in a list of notifications and the original requestObject and returns a list of tuples that contains the notifications
 * and their associated content
 * @deprecated Since QSCCD-125
 * @param notifications
 * @param requestObject
 * @returns {Promise<any>}
 */
function assocNotificationsWithItems(notifications, requestObject){

    return new Promise((resolve, reject) => {

        // A list containing all possible notification types that need to be refreshed
        // TODO: not an elegant way to do this... should create a mapping
        const itemList = ['Document', 'Announcement', 'TxTeamMessage', 'EducationalMaterial'];

        let fieldsToRefresh = [];

        // For each notification, build a list of content-types that need to be refreshed to be paired with the notification(s)
        notifications.forEach(notif => {

            if(itemList.includes(notif.NotificationType) && (!fieldsToRefresh.includes(notif.NotificationType) || !fieldsToRefresh.includes(notif.NotificationType + 's'))) {

                // Educational material mapping is singular... otherwise add 's' to end of key
                // TODO: This is a pretty bad way to handle this... should create a mapping
                let string =(notif.NotificationType !== 'EducationalMaterial') ? notif.NotificationType + 's' : notif.NotificationType;
                fieldsToRefresh.push(string);
            }
        });

        // Remove all duplicates from the array (there's no point in refreshing a category more than once)
        let uniqueFields = fieldsToRefresh.filter(function(e, index) {
            return fieldsToRefresh.indexOf(e) === index;
        });

        if(uniqueFields.length > 0) {
            // Refresh all the new data (should only be data that needs to be associated with notification)
            refresh(uniqueFields, requestObject)
                .then(results => {
                    if(!!results.Data){

                        // If we successfully were able to grab all the new data, then map them to their notification in tuple-form
                        let tuples = mapRefreshedDataToNotifications(results.Data, notifications);
                        resolve(tuples);
                    }
                    reject({Response:'error', Reason:'Could not associate any notifications to its content'});
                })
                .catch(err => resolve(err))
        } else resolve(notifications)
    })
}

/**
 * @deprecated Since QSCCD-125
 */
function mapRefreshedDataToNotifications(results, notifications) {

    logger.log('debug', 'notifications: ' + JSON.stringify(notifications));
    logger.log('debug', 'results: ' + JSON.stringify(results));

    let resultsArray = [];

    // Iterate through refreshed data object via its keys
    Object.keys(results).map(key => {
        resultsArray = resultsArray.concat(results[key]);
    });

    logger.log('debug', `results array: ${JSON.stringify(resultsArray)}`);

    // For each notification, find it's associated item in the results array and create a tuple
    return notifications.map(notif => {

        // TODO: It was a pretty bad idea to create an array, should later be changed to an object shaped in the following: {notification: {}, content: {}}
        let tuple = [];

        // Attempts to find the notifications associated content
        let item = resultsArray.find(result => {
            // TODO: This is really not the best way to handle this... should be a mapping
            let serNumField = notif.NotificationType + "SerNum";
            if(result.hasOwnProperty(serNumField)) return parseInt(result[serNumField]) === parseInt(notif.RefTableRowSerNum);
            return false;
        });

        tuple.push(notif);
        tuple.push(item);
        return tuple;
    });
}

/**
 * @deprecated Since QSCCD-125
 */
async function refresh (fields, requestObject) {
    let today = new Date();
    let timestamp = today.setHours(0,0,0,0);
    let patientSerNum = await getSelfPatientSerNum(requestObject.UserID);

    let rows = await exports.getPatientTableFields(requestObject.UserID, patientSerNum, fields, timestamp);
    rows.Data = utility.resolveEmptyResponse(rows.Data);
    return rows;
}

/**
 * @desc Gets the PatientSerNum associated with the given user (by Firebase userId).
 * @param userId The Firebase userId of the user.
 * @returns {Promise<*>} Resolves with the PatientSerNum of the user, or rejects with an error if not found.
 */
async function getSelfPatientSerNum(userId) {
    return (await Patient.getPatientByUsername(userId)).patientSerNum;
}
exports.getSelfPatientSerNum = getSelfPatientSerNum;
