var exports = module.exports = {};
const sqlInterface = require('./sqlInterface.js');
const logger = require('./../logs/logger.js');

//API call to log user out
exports.logout=function(requestObject)
{
  return sqlInterface.addToActivityLog(requestObject);
};

//Send message
exports.sendMessage=function(requestObject)
{
  return sqlInterface.sendMessage(requestObject);
};

//Input questionnaire answers to DB
exports.inputQuestionnaireAnswers = function(requestObject)
{
  return sqlInterface.inputQuestionnaireAnswers(requestObject);
};

//Input feedback
exports.inputFeedback=function(requestObject)
{
  return sqlInterface.inputFeedback(requestObject);
};

//User Account Change
exports.accountChange = function (requestObject) {
   return sqlInterface.updateAccountField(requestObject);
};

//Update Read Status
exports.updateClicked=function(requestObject)
{
  return sqlInterface.updateClicked(requestObject.UserID,requestObject.Parameters);
};

//Update checkin
exports.checkIn = function (requestObject) {
    return sqlInterface.checkIn(requestObject);
};

//Update device token for push notifications
exports.updateDeviceIdentifier= function(requestObject)
{
    logger.log('debug', 'update device identifier called at apiHospitalUpdate');
    return sqlInterface.updateDeviceIdentifier(requestObject);
};

//Input rating for 
exports.inputEducationalMaterialRating= function(requestObject)
{
  return sqlInterface.inputEducationalMaterialRating(requestObject);
};

// Get all notifications
exports.getAllNotifications = function (requestObject) {
    return sqlInterface.getAllNotifications(requestObject);
};

// Get new notifications
exports.getNewNotifications = function (requestObject) {
    return sqlInterface.getNewNotifications(requestObject);
};

//newly added

//get educational material log
exports.getEducationalLog = function(requestObject){
    console.log("in the apiHospitalUpdate");
    return sqlInterface.getEducationalLog(requestObject);
}

//update scroll to bottom
exports.updateScrollToBottom=function(requestObject)
{

    return sqlInterface.updateScrollToBottom(requestObject.UserID,requestObject.Parameters);
};

exports.updateSubScrollToBottom = function(requestObject){
    console.log("in updateSubScrollToBottom function api hospital");
    return sqlInterface.updateSubScrollToBottom(requestObject.UserID, requestObject.Parameters);
}
