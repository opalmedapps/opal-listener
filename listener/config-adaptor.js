// SPDX-FileCopyrightText: Copyright 2022 Opal Health Informatics Group at the Research Institute of the McGill University Health Centre <john.kildea@mcgill.ca>
//
// SPDX-License-Identifier: AGPL-3.0-or-later

/**
 * @file Provides a bridge to selected configurations in the new config file, which replaces the old config.json file.
 *       This file provides a single point of interaction with all necessary configurations, preventing the need to edit
 *       many references in old code to access configs in the new config file.
 */
const config = {};

// Add selected configs from the new file
// Database and Firebase settings
config.FIREBASE_ADMIN_KEY = process.env.FIREBASE_ADMIN_KEY_PATH;
config.DATABASE_URL = process.env.FIREBASE_DATABASE_URL;
config.FIREBASE_ROOT_BRANCH = process.env.FIREBASE_ROOT_BRANCH;
config.MYSQL_USERNAME = process.env.MYSQL_USERNAME;
config.MYSQL_PASSWORD = process.env.MYSQL_PASSWORD;
config.MYSQL_DATABASE = "OpalDB";
config.MYSQL_DATABASE_QUESTIONNAIRE = "QuestionnaireDB";
config.MYSQL_DATABASE_HOST = process.env.MYSQL_DATABASE_HOST;
config.BACKEND_HOST = process.env.BACKEND_HOST;
config.BACKEND_LISTENER_AUTH_TOKEN = process.env.BACKEND_LISTENER_AUTH_TOKEN;
config.MYSQL_DATABASE_PORT = process.env.MYSQL_DATABASE_PORT;
// Config settings
config.DOCUMENTS_PATH = process.env.DOCUMENTS_PATH;
config.DOCTOR_PATH = process.env.DOCTOR_PATH;
config.DICOM_PATH = process.env.DICOM_PATH;
config.QUESTIONNAIRE_COMPLETED_URL = process.env.QUESTIONNAIRE_COMPLETED_URL;
config.DEFAULT_LAB_EDUCATIONAL_URL_EN = process.env.DEFAULT_LAB_EDUCATIONAL_URL_EN;
config.DEFAULT_LAB_EDUCATIONAL_URL_FR = process.env.DEFAULT_LAB_EDUCATIONAL_URL_FR;
config.LATEST_STABLE_VERSION = process.env.LATEST_STABLE_VERSION ?? "0.0.1";
config.FEEDBACK_EMAIL = process.env.FEEDBACK_EMAIL;
config.FEEDBACK_EMAIL_HOST = process.env.FEEDBACK_EMAIL_HOST;
config.FEEDBACK_EMAIL_PORT = process.env.FEEDBACK_EMAIL_PORT;
// Checkins
config.ORMS_ENABLED = process.env.ORMS_ENABLED === '1';
config.ORMS_CHECKIN_URL = process.env.ORMS_CHECKIN_URL;
config.CHECKIN_ROOM = process.env.CHECKIN_ROOM;
config.SOURCE_SYSTEM_SUPPORTS_CHECKIN = process.env.SOURCE_SYSTEM_SUPPORTS_CHECKIN === '1';
config.SOURCE_SYSTEM_CHECKIN_URL = process.env.SOURCE_SYSTEM_CHECKIN_URL;
config.OPAL_CHECKIN_URL = process.env.OPAL_CHECKIN_URL;

export default config
