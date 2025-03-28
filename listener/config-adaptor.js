// SPDX-FileCopyrightText: Copyright 2022 Opal Health Informatics Group at the Research Institute of the McGill University Health Centre <john.kildea@mcgill.ca>
//
// SPDX-License-Identifier: AGPL-3.0-or-later

/**
 * @file Provides a bridge to selected configurations in the new config file, which replaces the old config.json file.
 *       This file provides a single point of interaction with all necessary configurations, preventing the need to edit
 *       many references in old code to access configs in the new config file.
 */

// Add selected configs from the new file
// Database and Firebase settings
module.exports.FIREBASE_ADMIN_KEY = process.env.FIREBASE_ADMIN_KEY_PATH;
module.exports.DATABASE_URL = process.env.FIREBASE_DATABASE_URL;
module.exports.FIREBASE_ROOT_BRANCH = process.env.FIREBASE_ROOT_BRANCH;
module.exports.MYSQL_USERNAME = process.env.MYSQL_USERNAME;
module.exports.MYSQL_PASSWORD = process.env.MYSQL_PASSWORD;
module.exports.MYSQL_DATABASE = "OpalDB";
module.exports.MYSQL_DATABASE_QUESTIONNAIRE = "QuestionnaireDB";
module.exports.MYSQL_DATABASE_HOST = process.env.MYSQL_DATABASE_HOST;
module.exports.BACKEND_HOST = process.env.BACKEND_HOST;
module.exports.BACKEND_LISTENER_AUTH_TOKEN = process.env.BACKEND_LISTENER_AUTH_TOKEN;
module.exports.MYSQL_DATABASE_PORT = process.env.MYSQL_DATABASE_PORT;
// Config settings
module.exports.DOCUMENTS_PATH = process.env.DOCUMENTS_PATH;
module.exports.DOCTOR_PATH = process.env.DOCTOR_PATH;
module.exports.QUESTIONNAIRE_COMPLETED_URL = process.env.QUESTIONNAIRE_COMPLETED_URL;
module.exports.DEFAULT_LAB_EDUCATIONAL_URL_EN = process.env.DEFAULT_LAB_EDUCATIONAL_URL_EN;
module.exports.DEFAULT_LAB_EDUCATIONAL_URL_FR = process.env.DEFAULT_LAB_EDUCATIONAL_URL_FR;
module.exports.LATEST_STABLE_VERSION = process.env.LATEST_STABLE_VERSION ?? "0.0.1";
module.exports.FEEDBACK_EMAIL=process.env.FEEDBACK_EMAIL;
module.exports.FEEDBACK_EMAIL_HOST=process.env.FEEDBACK_EMAIL_HOST;
module.exports.FEEDBACK_EMAIL_PORT=process.env.FEEDBACK_EMAIL_PORT;
// Checkins
module.exports.ORMS_ENABLED = process.env.ORMS_ENABLED === '1';
module.exports.ORMS_CHECKIN_URL = process.env.ORMS_CHECKIN_URL;
module.exports.CHECKIN_ROOM = process.env.CHECKIN_ROOM;
module.exports.SOURCE_SYSTEM_SUPPORTS_CHECKIN = process.env.SOURCE_SYSTEM_SUPPORTS_CHECKIN === '1';
module.exports.SOURCE_SYSTEM_CHECKIN_URL = process.env.SOURCE_SYSTEM_CHECKIN_URL;
module.exports.OPAL_CHECKIN_URL = process.env.OPAL_CHECKIN_URL;
