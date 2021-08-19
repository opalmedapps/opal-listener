var exports = module.exports = {};
var Q = require('q');
var sqlInterface = require('./sqlInterface.js');
var utility = require('./../utility/utility.js');
var validate = require('./../utility/validate.js');
var queries = require('./../sql/queries.js');
var logger = require('./../logs/logger.js');
const questionnaires = require('./../questionnaires/questionnaireOpalDB.js');

/**
 *@name login
 *@requires sqlInterface
 *@parameter(string) UserID Patients user ID
 *@description Grabs all the tables for the user and updates them to firebase
 */
exports.login = function (requestObject) {
    return sqlInterface.getPatientTableFields(requestObject.UserID, requestObject.Parameters.timestamp, requestObject.Parameters.Fields );
};

/**
*@name refresh
*@requires sqlInterface
*@parameter(string) UserID Patients User Id
*@parameter(string) Parameters, either an array of fields to be uploaded,
or a single table field.
*/
exports.resume=function(requestObject)
{
  return sqlInterface.getPatientTableFields(requestObject.UserID);
};

exports.refresh = function (requestObject) {
    var r = Q.defer();
    var UserId=requestObject.UserID;
    var parameters=requestObject.Parameters;
    var fields =parameters.Fields;
    var timestamp=parameters.Timestamp;

    if(!validate("Defined",fields))
    {
      r.reject({Response:'error',Reason:'Undefined Parameters'});
    }
    if(fields=='All'){
      sqlInterface.getPatientTableFields(UserId,timestamp).then(function(objectToFirebase){
        objectToFirebase.Data = utility.resolveEmptyResponse(objectToFirebase.Data);
        r.resolve(objectToFirebase);
      }).catch(function(error){
        r.reject(error);
      });
    }else {
      if(!(typeof fields.constructor !=='undefined'&&fields.constructor=== Array)) fields=[fields];
        if (!validate('RefreshArray', fields)) {
            r.reject({Reason:'Incorrect refresh parameters',Response:'error'});
        }
        sqlInterface.getPatientTableFields(UserId, timestamp, fields).then(function (rows) {
            rows.Data=utility.resolveEmptyResponse(rows.Data);
            r.resolve(rows);
        },function(error)
        {
            r.reject(error);
        });
    }
    return r.promise;
};

//Check checkin API call
exports.checkCheckin = function(requestObject)
{
    var r = Q.defer();

    sqlInterface.checkCheckin(requestObject.Parameters.PatientSerNum)
        .then(function(hasAttempted){ r.resolve({Data: { AttemptedCheckin: hasAttempted}}) })
        .catch(function(err){ r.reject(err) });

    return r.promise;
};

//Get checkin update API call
exports.checkinUpdate = function(requestObject)
{
  //console.log('Checkin update!');
  return sqlInterface.checkinUpdate(requestObject);
};

//Get Map Location API call
exports.getMapLocation=function(requestObject)
{
   return sqlInterface.getMapLocation(requestObject);
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
exports.getStudies = function(requestObject) 
{
  return sqlInterface.getStudies(requestObject);
}

/**
*@name getStudyQuestionnaires
*@description Gets the questionnaires associated with the current study.
*@param {object} requestObject
*@returns {Promise}
*/
exports.getStudyQuestionnaires = function(requestObject)
{
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
 * For questionnaire V2 (2019 version of qplus questionnaire front-end). Getting the list of questionnaires belonging to a patient
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

exports.getPatientsForPatientsMembers = function ()
{
  return new Promise((resolve, reject)=>{
      sqlInterface.runSqlQuery(queries.getPatientForPatientMembers(),[]).then((members)=>{
         resolve({Data:members});
      }).catch((err) => reject({Response:error, Reason:err}));
  });
};
