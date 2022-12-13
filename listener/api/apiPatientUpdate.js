var Q = require('q');
var sqlInterface = require('./sqlInterface.js');
var utility = require('./../utility/utility.js');
var queries = require('./../sql/queries.js');
var logger = require('./../logs/logger.js');
const questionnaires = require('./../questionnaires/questionnaireOpalDB.js');

/**
 *@name login
 *@requires sqlInterface
 *@parameter(string) UserID Patients user ID
 *@description Grabs all the tables for the user and updates them to firebase
 */
exports.login = async function(requestObject) {
    let patientSerNum = await sqlInterface.getSelfPatientSerNum(requestObject.UserID);
    return await sqlInterface.getPatientTableFields(requestObject.UserID, patientSerNum, requestObject.Parameters.Fields, requestObject.Parameters.timestamp);
};

/**
 * @desc Retrieves patient data in a given set of categories. This function is called 'refresh' because it can be used
 *       to fetch only fresh data after a certain timestamp.
 * @param requestObject The request object.
 * @param {string} requestObject.UserID The Firebase user ID that will be used to get data if no PatientSerNum is provided.
 * @param {string[]} requestObject.Parameters.Fields The list of data categories from which to fetch data.
 * @param [requestObject.Parameters.Timestamp] Optional date/time; if provided, only items with 'LastUpdated' after this time are returned.
 * @returns {Promise<*>}
 */
exports.refresh = async function(requestObject) {
    let UserId = requestObject.UserID;
    let parameters = requestObject.Parameters;
    let fields = parameters.Fields;

    // If there's a TargetPatientID, use it, otherwise get data for self
    let patientSerNum = requestObject.TargetPatientID ? requestObject.TargetPatientID : await sqlInterface.getSelfPatientSerNum(UserId);
    logger.log('info', `Identified request target as PatientSerNum = ${patientSerNum}`);

    if (!fields) throw {Response:'error', Reason:"Undefined 'Fields' in Refresh request"};
    if (!Array.isArray(fields)) fields = [fields];

    let rows = await sqlInterface.getPatientTableFields(UserId, patientSerNum, fields, parameters.Timestamp, parameters?.purpose);
    rows.Data = utility.resolveEmptyResponse(rows.Data);

    return rows;
};

//Check checkin API call
// TODO (QSCCD-106) - Make use of requestObject.TargetPatientID to check in on behalf of others or as self
exports.checkCheckin = function(requestObject)
{
    var r = Q.defer();

    sqlInterface.checkCheckin(requestObject.Parameters.PatientSerNum)
        .then(function(hasAttempted){ r.resolve({Data: { AttemptedCheckin: hasAttempted}}) })
        .catch(function(err){ r.reject(err) });

    return r.promise;
};

// Get the contents of an educational material package.
exports.getPackageContents = function(requestObject){
    return sqlInterface.getPackageContents(requestObject);
};

//Get Document Content
exports.getDocumentsContent=function(requestObject)
{

   return sqlInterface.getDocumentsContent(requestObject);
};


exports.getSecurityQuestion = function (requestObject) {
    return sqlInterface.getSecurityQuestion(requestObject);
};

/**
*@name getStudies
*@description Gets the studies associated with the current patient.
*@param {object} requestObject
*@returns {Promise}
*/
exports.getStudies = function(requestObject) {
    return sqlInterface.getStudies(requestObject);
}

/**
*@name getStudyQuestionnaires
*@description Gets the questionnaires associated with the current study.
*@param {object} requestObject
*@returns {Promise}
*/
exports.getStudyQuestionnaires = function(requestObject) {
    return sqlInterface.getStudyQuestionnaires(requestObject);
}

// exports.isTrustedDevice = function (requestObject) {
//     return sqlInterface.isTrustedDevice(requestObject);
// };

exports.logActivity = function (requestObject) {
    logger.log('info', 'User Activity', {
        deviceID:requestObject.DeviceId,
        userID:requestObject.UserID,
        request:requestObject.Request,
        activity:requestObject.Parameters.Activity,
        activityDetails: requestObject.Parameters.ActivityDetails
    });
    return Q.resolve({Response:'success'});
};

// Log a patient action (clicked, scrolled to bottom, etc.).
exports.logPatientAction = function(requestObject){
    return sqlInterface.logPatientAction(requestObject);
};

exports.logPatientRequest = function(requestObject) {
    return sqlInterface.addToActivityLog(requestObject);
};

// API call to log user out
exports.logout = function(requestObject) {
    // For now, the only purpose of the logout request is to record a timestamp in PatientActivityLog (done separately in logPatientRequest)
    return Promise.resolve({Response: "Successful logout"});
};

/**
 * @desc Gets patient info for the current user.
 * @param requestObject
 * @returns {Promise}
 */
exports.getUserPatient = requestObject => sqlInterface.getUserPatient(requestObject);

/**
 * For questionnaire V2 (2019 version of qplus questionnaire front-end). Getting the list of questionnaires belonging to a patient
 * @deprecated Since QSCCD-230
 * @param {object} requestObject
 * @returns {Promise}
 */
exports.getQuestionnaireList = questionnaires.getQuestionnaireList;

/**
 * For questionnaire V2 (2019 version of qplus questionnaire front-end).
 * Getting the information about a questionnaire stored in OpalDB from its QuestionnaireSerNum
 * @param {object} requestObject
 * @returns {Promise}
 */
exports.getQuestionnaireInOpalDB = questionnaires.getQuestionnaireInOpalDB;

/**
 * For questionnaire V2 (2019 version of qplus questionnaire front-end). Gets one questionnaire.
 * @param {object} requestObject
 * @returns {Promise}
 */
exports.getQuestionnaire = questionnaires.getQuestionnaire;

/**
* Gets the purpose of the current questionnaire.
* @param {object} requestObject
* @returns {Promise}
*/
exports.getQuestionnairePurpose = questionnaires.getQuestionnairePurpose;

/**
* Gets the number of unread (e.g. 'New') questionnaires.
* @param {object} requestObject
* @returns {Promise}
*/
exports.getQuestionnaireUnreadNumber = questionnaires.getQuestionnaireUnreadNumber;

/**
 * @deprecated
 * @returns
 */
exports.getPatientsForPatientsMembers = function ()
{
  return new Promise((resolve, reject)=>{
      sqlInterface.runSqlQuery(queries.getPatientForPatientMembers(),[]).then((members)=>{
         resolve({Data:members});
      }).catch((err) => reject({Response:error, Reason:err}));
  });
};
