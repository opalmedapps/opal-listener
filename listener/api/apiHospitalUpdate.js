// SPDX-FileCopyrightText: Copyright 2016 Opal Health Informatics Group at the Research Institute of the McGill University Health Centre <john.kildea@mcgill.ca>
//
// SPDX-License-Identifier: AGPL-3.0-or-later

const sqlInterface = require('./sqlInterface.js');
const logger = require('./../logs/logger.js');
const questionnaires = require('./../questionnaires/questionnaireOpalDB.js');

exports.omitParametersFromLogs = sqlInterface.omitParametersFromLogs;

/**
 * This is for questionnaire V2 (inputting a single question's answer for 2019 qplus questionnaire front-end)
 * @param {object} requestObject
 * @returns {Promise}
 */
exports.questionnaireSaveAnswer = questionnaires.questionnaireSaveAnswer;

/**
 * This is for questionnaire V2 (2019 qplus questionnaire front-end). Update the status of one questionnaire
 * @param {object} requestObject
 * @returns {Promise}
 */
exports.questionnaireUpdateStatus = questionnaires.questionnaireUpdateStatus;

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
exports.updateReadStatus=function(requestObject)
{
  requestObject.Parameters["TargetPatientID"] = requestObject.TargetPatientID;
  return sqlInterface.updateReadStatus(requestObject.UserID, requestObject.Parameters);
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

/**
 * @desc Get new notifications for the current user.
 * @deprecated Since QSCCD-125. This function provides duplicate functionality to 'Notifications' in requestMappings.
 * @param requestObject
 * @returns {*}
 */
exports.getNewNotifications = function (requestObject) {
    return sqlInterface.getNewNotifications(requestObject);
};

// Update study consent status
exports.studyUpdateStatus = function (requestObject)
{
    return sqlInterface.studyUpdateStatus(requestObject);
};
