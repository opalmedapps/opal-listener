const mysql             = require('mysql');
const filesystem        = require('fs');
const Q                 = require('q');
const queries           = require('./../sql/queries.js');
const config            = require('./../config.json');
const requestUtility    = require("../utility/requestUtility");
const Mail              = require('./../mailer/mailer.js');
const utility           = require('./../utility/utility');
const logger            = require('./../logs/logger');
const {OpalSQLQueryRunner} = require("../sql/opal-sql-query-runner");
const ssl               = require('../security/ssl');

var exports = module.exports = {};

/******************************
 * CONFIGURATIONS
 ******************************/
const waitingRoomDbCredentials = {
	connectionLimit: 10,
    host: config.WAITING_ROOM_MANAGEMENT_SYSTEM_MYSQL.HOST,
    port: config.WAITING_ROOM_MANAGEMENT_SYSTEM_MYSQL.PORT,
	user: config.WAITING_ROOM_MANAGEMENT_SYSTEM_MYSQL.MYSQL_USERNAME,
	password: config.WAITING_ROOM_MANAGEMENT_SYSTEM_MYSQL.MYSQL_PASSWORD,
	database: config.WAITING_ROOM_MANAGEMENT_SYSTEM_MYSQL.MYSQL_DATABASE,
	dateStrings: true
};

const waitingRoomPool = mysql.createPool(waitingRoomDbCredentials);

/////////////////////////////////////////////////////

/******************************
 * MAPPINGS
 ******************************/

/**
 * Table mappings and process data functions for results obtained from the database. Exporting function for testing purposes.
 * @type {{Patient: {sql, processFunction: loadProfileImagePatient, numberOfLastUpdated: number}, Documents: {sql, numberOfLastUpdated: number, table: string, serNum: string}, Doctors: {sql, processFunction: loadImageDoctor, numberOfLastUpdated: number}, Diagnosis: {sql, numberOfLastUpdated: number}, Appointments: {sql, numberOfLastUpdated: number, processFunction: combineResources, table: string, serNum: string}, Notifications: {sql, numberOfLastUpdated: number, table: string, serNum: string}, Tasks: {sql, numberOfLastUpdated: number}, TxTeamMessages: {sql, numberOfLastUpdated: number, table: string, serNum: string}, EducationalMaterial: {sql, processFunction: getEducationTableOfContents, numberOfLastUpdated: number, table: string, serNum: string}, Announcements: {sql, numberOfLastUpdated: number, table: string, serNum: string}}}
 */
const requestMappings =
    {
        'Patient': {
            sql: queries.patientTableFields(),
            processFunction: loadProfileImagePatient,
            numberOfLastUpdated: 1
        },
        'Documents': {
            sql: queries.patientDocumentTableFields(),
            numberOfLastUpdated: 2,
            //processFunction:LoadDocuments,
            table: 'Document',
            serNum: 'DocumentSerNum'
        },
        'Doctors': {
            sql: queries.patientDoctorTableFields(),
            processFunction: loadImageDoctor,
            numberOfLastUpdated: 2
        },
        'Diagnosis': {
            sql: queries.patientDiagnosisTableFields(),
            numberOfLastUpdated: 1
        },
        'Appointments': {
            sql: queries.patientAppointmentsTableFields(),
            numberOfLastUpdated: 5,
            processFunction: combineResources,
            table: 'Appointment',
            serNum: 'AppointmentSerNum'
        },
        'Notifications': {
            sql: queries.patientNotificationsTableFields(),
            numberOfLastUpdated: 0,
            table: 'Notification',
            serNum: 'NotificationSerNum'
        },
        'Tasks': {
            sql: queries.patientTasksTableFields(),
            numberOfLastUpdated: 2
        },
        'TxTeamMessages': {
            sql: queries.patientTeamMessagesTableFields(),
            processFunction: decodePostMessages,
            numberOfLastUpdated: 2,
            table: 'TxTeamMessage',
            serNum: 'TxTeamMessageSerNum'
        },
        'EducationalMaterial': {
            sql: queries.patientEducationalMaterialTableFields(),
            processFunction: getEducationTableOfContents,
            numberOfLastUpdated: 5,
            table: 'EducationalMaterial',
            serNum: 'EducationalMaterialSerNum'
        },
        'Announcements': {
            sql: queries.patientAnnouncementsTableFields(),
            processFunction: decodePostMessages,
            numberOfLastUpdated: 2,
            table: 'Announcement',
            serNum: 'AnnouncementSerNum'
        }
    };


//////////////////////////////////////////////////////////////////

/******************************
 * FUNCTIONS
 ******************************/

/**
 * getSqlApiMapping
 * @return {{Patient: {sql, processFunction: loadProfileImagePatient, numberOfLastUpdated: number}, Documents: {sql, numberOfLastUpdated: number, table: string, serNum: string}, Doctors: {sql, processFunction: loadImageDoctor, numberOfLastUpdated: number}, Diagnosis: {sql, numberOfLastUpdated: number}, Appointments: {sql, numberOfLastUpdated: number, processFunction: combineResources, table: string, serNum: string}, Notifications: {sql, numberOfLastUpdated: number, table: string, serNum: string}, Tasks: {sql, numberOfLastUpdated: number}, TxTeamMessages: {sql, numberOfLastUpdated: number, table: string, serNum: string}, EducationalMaterial: {sql, processFunction: getEducationTableOfContents, numberOfLastUpdated: number, table: string, serNum: string}, Announcements: {sql, numberOfLastUpdated: number, table: string, serNum: string}}}
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
 * runWaitingRoomSqlQuery
 * @desc runs inputted query against SQL mapping by grabbing an available connection from connection pool
 * @param query
 * @param parameters
 * @param processRawFunction
 * @return {Promise}
 */
exports.runWaitingRoomSqlQuery = function(query, parameters, processRawFunction) {
    return new Promise((resolve, reject) => {
        waitingRoomPool.getConnection((err, connection) => {
            if (err) {
                logger.log('error', err)
                return reject(err)
            }
            logger.log('debug', `grabbed waiting room connection: ${connection}`)
            logger.log('info', 'Successfully grabbed connection from waiting room pool and about to perform following query: ', {query: query})
            const que = connection.query(query, parameters, (err, rows, fields) => {
                connection.release();
                if (err) {
                    logger.log('error', err)
                    return reject(err)
                }
                logger.log('info', 'Successfully performed query on waiting room database', {query: que.sql, response: JSON.stringify(rows)});
                if (processRawFunction) {
                    processRawFunction(rows).then(resolve)
                } else {
                    resolve(rows)
                }
            })
        })
    })
}

/**
 * getPatientTableFields
 * @desc Gets Patient tables based on userID,  if timestamp defined sends requests that are only updated after timestamp, third parameter is an array of table names, if not present all tables are gathered
 * @param userId
 * @param timestamp
 * @param arrayTables
 * @return {Promise}
 */
exports.getPatientTableFields = function(userId,timestamp,arrayTables) {
    const r = Q.defer();
    var timestp = (timestamp)?timestamp:0;
    const objectToFirebase = {};
    let index = 0;
    Q.all(preparePromiseArrayFields(userId,timestp,arrayTables)).then(function(response){
        if(arrayTables) {
            for (let i = 0; i < arrayTables.length; i++) {
                objectToFirebase[arrayTables[i]]=response[index];
                index++;
            }
        }else{
            for (const key in requestMappings) {
                objectToFirebase[key]=response[index];
                index++;
            }
        }
        r.resolve({Data:objectToFirebase,Response:'success'});
    },function(error){
        logger.log('error', 'Problems querying the database due to ' + error);
        r.reject({Response:'error',Reason:'Problems querying the database due to ' + error});
    });
    return r.promise;
};

/**
 * processSelectRequest
 * @desc Gets the correct request mapping object and runs the query against the sql function
 * @param table
 * @param userId
 * @param timestamp
 * @return {Promise}
 */
function processSelectRequest(table, userId, timestamp) {
    const r = Q.defer();

    const requestMappingObject = requestMappings[table];

    let date = new Date(0);
    if(timestamp) {
        date=new Date(Number(timestamp));
    }

    const paramArray = [userId];
    if(requestMappingObject.numberOfLastUpdated>0){
        for (let i = 0; i < requestMappingObject.numberOfLastUpdated; i++) {
            paramArray.push(date);
        }
    }

    if(requestMappingObject.hasOwnProperty('sql')) {
        exports.runSqlQuery(requestMappingObject.sql,paramArray, requestMappingObject.processFunction).then(function(rows) {
            r.resolve(rows);
        },function(err) {
            r.reject(err);
        });
    }else{
        requestMappingObject.processFunction(userId,timestamp).then(function(rows) {
            r.resolve(rows);
        },function(err) {
            r.reject(err);
        });
    }

    return r.promise;
}

/**
 * preparePromiseArrayFields
 * @desc Preparing a promise array for later retrieval
 * @param userId
 * @param timestamp
 * @param arrayTables
 * @return {Array}
 */
function preparePromiseArrayFields(userId,timestamp,arrayTables) {
    const array = [];

    if(typeof arrayTables!=='undefined')
    {
        for (let i = 0; i < arrayTables.length; i++) {
            array.push(processSelectRequest(arrayTables[i],userId,timestamp));
        }
    }else{
        for (const key in requestMappings) {

            array.push(processSelectRequest(key,userId,timestamp));
        }
    }
    return array;
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

        exports.runSqlQuery(queries.updateReadStatus(),[table, table, serNum, parameters.Id]).then(()=>{
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
                    logger.log('error', errorReason3);
                    logger.log('error', JSON.stringify(err));
                    r.reject({Response:'error',Reason:errorReason3});
                });
            }
            else {
                let errorReason2 = 'No PatientSerNum found when looking up the user in the database.';
                logger.log('error', errorReason2);
                logger.log('error', JSON.stringify(err));
                r.reject({Response:'error',Reason:errorReason2});
            }
        }).catch((err) => {
            let errorReason1 = 'Error looking up the user\'s PatientSerNum in the database.';
            logger.log('error', errorReason1);
            logger.log('error', JSON.stringify(err));
            r.reject({Response:'error',Reason:errorReason1});
        });
    }
    return r.promise;
};

/**
 * sendMessage
 * @desc inserts a message into messages table
 * @param requestObject
 * @return {Promise}
 */
exports.sendMessage=function(requestObject) {
    return exports.runSqlQuery(queries.sendMessage(requestObject));
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
        const patientSerNum = requestObject.Parameters.PatientSerNum;

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
            if (success) return await getCheckedInAppointments(patientSerNum);
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
    // Validate the existence of the check-in path
    if (!config.CHECKIN_PATH || config.CHECKIN_PATH === "") throw "No value was provided for CHECKIN_PATH in the config file";

    let options = {
        method: "post",
        url: config.CHECKIN_PATH,
        json: true,
        body: {
            "mrn": mrn,
            "site": mrnSite,
            "room": config.CHECKIN_ROOM,
        },
    };

    await requestUtility.request(options);
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
 * getDocumentsContent
 * @desc fetches a document's content from DB
 * @param requestObject
 * @return {Promise}
 */
exports.getDocumentsContent = function(requestObject) {

    let r = Q.defer();
    let documents = requestObject.Parameters;
    let userID = requestObject.UserID;
    if(!(typeof documents.constructor !=='undefined'&&documents.constructor=== Array)){
        r.reject({Response:'error',Reason:'Not an array'});
    }else{
        exports.runSqlQuery(queries.getDocumentsContentQuery(), [[documents],userID]).then((rows)=>{
            if(rows.length === 0) {
                r.resolve({Response:'success',Data:'DocumentNotFound'});
            } else {
                LoadDocuments(rows).then(function(documents) {
                    if(documents.length === 1) r.resolve({Response:'success',Data:documents[0]});
                    else r.resolve({Response:'success',Data:documents});
                }).catch(function (err) {
                    r.reject({Response:'error', Reason:err});
                });
            }
        }).catch((err)=>{
            r.reject({Response:'error',Reason:err});
        });
    }
    return r.promise;
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
            exports.runSqlQuery(queries.setNewPassword(), [hashedPassword, patient.PatientSerNum])
                .then(()=>{
                    delete requestObject.Parameters.NewValue;
                    r.resolve({Response:'success'});
                }).catch((err)=>{
	                r.reject({Response:'error',Reason:err});
                });
            //If not a password field update
        }else if(validFields.includes(field)){
            exports.runSqlQuery(queries.accountChange(), [field, newValue, requestObject.Token, patient.PatientSerNum])
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
        exports.runSqlQuery(queries.inputFeedback(),[ patient.PatientSerNum, feedback, appRating, requestObject.Token ])
            .then(()=>{
	            let replyTo = null;
	            let email;
                let subject;
	            // Determine if the feedback is for the app or patients committee
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

    logger.log('debug', 'in update device id with : ' + JSON.stringify(requestObject));

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

    getPatientFromEmail(email).then(function(user){

        exports.runSqlQuery(queries.updateDeviceIdentifiers(),[user.PatientSerNum, requestObject.DeviceId, identifiers.registrationId, deviceType, appVersion, requestObject.Token, identifiers.registrationId, requestObject.Token])
            .then(()=>{
                logger.log('debug', 'successfully updated device identifiers');
                r.resolve({Response:'success'});
            }).catch((error)=>{
                let errorMessage = 'Error updating device identifiers due to ' + JSON.stringify(error);
                logger.log('error', errorMessage);
                r.reject({Response:'error', Reason: errorMessage});
            });
    }).catch((error)=>{
        let errorMessage = 'Error getting patient fields due to ' + JSON.stringify(error);
        logger.log('error', errorMessage);
        r.reject({Response:'error', Reason: errorMessage});
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

    let {Request, UserID, DeviceId, Token, AppVersion} = requestObject;

    if (typeof Request === "undefined") Request = requestObject.type;
    if (typeof UserID === "undefined") UserID = requestObject.meta.UserID;
    if (typeof DeviceId === "undefined") DeviceId = requestObject.meta.DeviceId;
    if (typeof Token === "undefined") Token = requestObject.meta.Token;
    if (typeof AppVersion === "undefined") AppVersion = requestObject.meta.AppVersion;

    // Ignore LogPatientAction to avoid double-logging --> Refer to table PatientActionLog
    if (Request !== "LogPatientAction") {
        exports.runSqlQuery(queries.logActivity(),[Request, UserID, DeviceId, Token, AppVersion])
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
 * @name getFirstEncryption
 * @param requestObject
 */
exports.getFirstEncryption=function(requestObject) {
    let r=Q.defer();
    exports.runSqlQuery(queries.securityQuestionEncryption(),[requestObject.UserID])
        .then((rows)=>{
            r.resolve(rows);
        }).catch((err)=>{
            r.reject({Response:'error', Reason:err});
        });
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
 * @name getMapLocation
 * @description Obtains map location via QR code
 * @deprecated
 * @param requestObject
 */
exports.getMapLocation=function(requestObject) {
    let r = Q.defer();

    if(!requestObject.Parameters || !requestObject.Parameters.QRCode) {
        r.reject({Response:'error', Reason:'Incorrect parameter'});
    }

    exports.runSqlQuery(queries.getMapLocation(),[requestObject.Parameters.QRCode]).then((rows)=>{
        r.resolve({Response:'success', Data:{MapLocation:rows[0]}});
    }).catch((err)=>{
        r.reject({Response:'error', Reason:err});
    });

    return r.promise;
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
                logger.log('error', errorReason2);
                logger.log('error', JSON.stringify(err));
                r.reject({Response:'error',Reason:errorReason2});
            });
        }).catch((err)=>{
            let errorReason1 = 'Error getting package contents from the database.';
            logger.log('error', errorReason1);
            logger.log('error', JSON.stringify(err));
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
    return exports.runSqlQuery(queries.increaseSecurityAnswerAttempt(),[requestObject.DeviceId]);
};

/**
 * @name resetSecurityAnswerAttempt
 * @description Sets the security answer attempt to zero
 * @param requestObject
 */
exports.resetSecurityAnswerAttempt = function(requestObject) {
    return exports.runSqlQuery(queries.resetSecurityAnswerAttempt(),[requestObject.DeviceId]);
};

/**
 * @name setTimeoutSecurityAnswer
 * @description Sets up timeout for device with incorrect security answer
 * @param requestObject
 * @param timestamp
 */
exports.setTimeoutSecurityAnswer = function(requestObject, timestamp) {
    return exports.runSqlQuery(queries.setTimeoutSecurityAnswer(),[new Date(timestamp), requestObject.DeviceId]);
};

/**
 * getPatientFieldsForPasswordReset
 * @desc gets patient fields for password reset
 * @param requestObject
 * @return {Promise}
 */
exports.getPatientFieldsForPasswordReset=function(requestObject) {
    return exports.runSqlQuery(queries.getPatientFieldsForPasswordReset(),[requestObject.UserEmail, requestObject.DeviceId]);
};

/**
 * setNewPassword
 * @desc updates user's password in DB
 * @param password
 * @param patientSerNum
 * @return {Promise}
 */
exports.setNewPassword=function(password,patientSerNum) {
    return exports.runSqlQuery(queries.setNewPassword(),[password,patientSerNum]);
};

/**
 * getPatientDeviceLastActivity
 * @desc gets the patient's last active timestamp
 * @param userid
 * @param device
 * @return {Promise}
 */
exports.getPatientDeviceLastActivity = function(userid,device)
{
    let r = Q.defer();
    exports.runSqlQuery(queries.getPatientDeviceLastActivity(), [userid,device]).then((rows)=>{
        r.resolve(rows[0]);
    }).catch((err)=>{
        r.reject(err);
    });
    return r.promise;
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
        [EducationalMaterialControlSerNum, PatientSerNum, RatingValue, requestObject.Token])
        .then(()=>{
            r.resolve({Response:'success'});
        }).catch((err)=>{
            r.reject({Response:'error',Reason:err});
        });
    return r.promise;
};

/**
 * updateLogout
 * @param fields
 * @return {Promise}
 */
exports.updateLogout = function(fields) {
    return exports.runSqlQuery(queries.updateLogout(), fields);
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
 * @name getPasswordForVerification
 * @desc gets the user's password to crosscheck during login to verify that Firebase and DB passwords are synced
 * @param email
 * @return {Promise}
 */
exports.getPasswordForVerification = function(email) {
    let r=Q.defer();
    exports.runSqlQuery(queries.getPatientPasswordForVerification(), [email])
        .then((rows)=>{
            if(rows.length === 0) r.reject({Response:'error',Reason:"No User match in DB"});
            r.resolve(rows[0]);
        }).catch((err)=> {
            r.reject({Response: err, Reason:"Problem Fetching Password for verification"});
        });
    return r.promise;
};

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
function getEducationTableOfContents(rows)
{
    var r = Q.defer();
    var indexes = [];
    var promises =[];
    for (var i = rows.length-1; i >= 0; i--) {
        if(!rows[i].URL_EN || typeof rows[i].URL_EN == 'undefined'|| rows[i].URL_EN.length === 0)
        {
            var array=[];
            for (var j = rows.length-1; j >= 0; j--) {
                if(rows[j].EducationalMaterialSerNum == rows[i].EducationalMaterialSerNum && rows[j].EducationalMaterialControlSerNum !== rows[i].EducationalMaterialControlSerNum)
                {
                    indexes.push(j);
                }
            }
        }
    }
    //Delete
    for (var k = rows.length-1; k >= 0; k--) {
        if(indexes.indexOf(k) !== -1)
        {
            rows.splice(k,1);
        }
    }
    for (var l = 0; l < rows.length; l++) {
        promises.push(exports.runSqlQuery(queries.patientEducationalMaterialContents(),[rows[l].EducationalMaterialControlSerNum] ));
    }
    Q.all(promises).then(
        function(results){
            for (var i = 0; i < results.length; i++) {
                if(results[i].length !== 0)
                {
                    for (var j = 0; j < rows.length; j++) {
                        if(rows[j].EducationalMaterialControlSerNum ==results[i][0].ParentSerNum)
                        {
                            rows[j].TableContents = results[i];
                        }
                    }
                }
            }
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

exports.getSecurityQuestion = function (requestObject){
    var r = Q.defer();

    logger.log('debug', 'in get secyurity wquestuion in sql interface');

    var obj={};
    var Data = {};
    var userEmail = requestObject.UserEmail;

    exports.runSqlQuery(queries.getSecQuestion(),[userEmail])
        .then(function (queryRows) {

            if (queryRows.length != 1 ) r.reject({Response:'error', Reason:'More or less than one question returned'});
            Data.securityQuestion = {
                securityQuestion_EN: queryRows[0].QuestionText_EN,
                securityQuestion_FR: queryRows[0].QuestionText_FR
            }
            obj.Data = Data;
            return exports.runSqlQuery(queries.setDeviceSecurityAnswer(), [queryRows[0].SecurityAnswerSerNum, requestObject.DeviceId, queryRows[0].PatientSerNum])
        })
        .then(function () {
            r.resolve(obj);
        })
        .catch(function (error) {
            r.reject({Response:'error', Reason:'Error getting security question due to '+error});
        });

    return r.promise;
};

exports.setTrusted = function(requestObject)
{

    var r = Q.defer();
    exports.runSqlQuery(queries.setTrusted(),[requestObject.DeviceId])
        .then(function (queryRows) {
            r.resolve({Response:'success'});
        })
        .catch(function (error) {
            r.reject({Response:'error', Reason:'Error getting setting trusted device '+error});
        });

    return r.promise;

};

/**
 * NOTIFICATIONS FUNCTIONALITY
 * ========================================================================
 */

/**
 * Returns a promise containing all new notifications
 * @param {object} requestObject the request
 * @returns {Promise} Returns a promise that contains the notification data
 */

exports.getNewNotifications = function(requestObject){
    let r = Q.defer();

    let lastUpdated = new Date(Number(requestObject.Parameters.LastUpdated));

    exports.runSqlQuery(queries.getNewNotifications(), [requestObject.UserID, lastUpdated, lastUpdated])
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

function mapRefreshedDataToNotifications(results, notifications) {

    logger.log('debug', 'notifications: ' + JSON.stringify(notifications));
    logger.log('debug', 'results: ' + JSON.stringify(results));

    let resultsArray = [];

    // Iterate through refreshed data object via its keys
    Object.keys(results).map(key => {
        resultsArray = resultsArray.concat(results[key]);
    });

    logger.log('debug', 'results array: ' + JSON.stringify(resultsArray));

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

function refresh (fields, requestObject) {
    let r = Q.defer();
    let UserId=requestObject.UserID;
    let today = new Date();
    let timestamp = today.setHours(0,0,0,0);

    exports.getPatientTableFields(UserId, timestamp, fields).then(rows => {
        rows.Data= utility.resolveEmptyResponse(rows.Data);
        r.resolve(rows);
    }).catch(err => r.reject(err));

    return r.promise;
}
