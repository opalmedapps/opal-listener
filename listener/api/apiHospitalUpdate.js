// SPDX-FileCopyrightText: Copyright 2016 Opal Health Informatics Group at the Research Institute of the McGill University Health Centre <john.kildea@mcgill.ca>
//
// SPDX-License-Identifier: AGPL-3.0-or-later

import sqlInterface from './sqlInterface.js';
import logger from './../logs/logger.js';
import questionnaires from './../questionnaires/questionnaireOpalDB.js';

const omitParametersFromLogs = sqlInterface.omitParametersFromLogs;

/**
 * This is for questionnaire V2 (inputting a single question's answer for 2019 qplus questionnaire front-end)
 * @param {object} requestObject
 * @returns {Promise}
 */
const questionnaireSaveAnswer = questionnaires.questionnaireSaveAnswer;

/**
 * This is for questionnaire V2 (2019 qplus questionnaire front-end). Update the status of one questionnaire
 * @param {object} requestObject
 * @returns {Promise}
 */
const questionnaireUpdateStatus = questionnaires.questionnaireUpdateStatus;

const inputFeedback = sqlInterface.inputFeedback;

const accountChange = sqlInterface.updateAccountField;

function updateReadStatus(requestObject) {
  requestObject.Parameters["TargetPatientID"] = requestObject.TargetPatientID;
  return sqlInterface.updateReadStatus(requestObject.UserID, requestObject.Parameters);
}

const checkIn = sqlInterface.checkIn;

//Update device token for push notifications
function updateDeviceIdentifier(requestObject) {
    logger.log('debug', 'update device identifier called at apiHospitalUpdate');
    return sqlInterface.updateDeviceIdentifier(requestObject);
}

const inputEducationalMaterialRating = sqlInterface.inputEducationalMaterialRating;

/**
 * @desc Get new notifications for the current user.
 * @deprecated Since QSCCD-125. This function provides duplicate functionality to 'Notifications' in requestMappings.
 * @param requestObject
 * @returns {*}
 */
const getNewNotifications = sqlInterface.getNewNotifications;

const studyUpdateStatus = sqlInterface.studyUpdateStatus;

export default {
    omitParametersFromLogs,
    questionnaireSaveAnswer,
    questionnaireUpdateStatus,
    inputFeedback,
    accountChange,
    updateReadStatus,
    checkIn,
    updateDeviceIdentifier,
    inputEducationalMaterialRating,
    getNewNotifications,
    studyUpdateStatus,
}
