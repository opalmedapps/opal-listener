/**
 * @file Provides a bridge to selected configurations in the new config file, which replaces the old config.json file.
 *       This file provides a single point of interaction with all necessary configurations, preventing the need to edit
 *       many references in old code to access configs in the new config file.
 * @author Stacey Beard
 */

// Add selected configs from the new file
// Database and Firebase settings
module.exports.FIREBASE_ADMIN_KEY = process.env.FIREBASE_ADMIN_KEY_PATH;
module.exports.DATABASE_URL = process.env.FIREBASE_DATABASE_URL;
module.exports.FIREBASE_ROOT_BRANCH = process.env.FIREBASE_ROOT_BRANCH;
module.exports.MYSQL_USERNAME = process.env.MYSQL_USERNAME;
module.exports.MYSQL_PASSWORD = process.env.MYSQL_PASSWORD;
module.exports.MYSQL_DATABASE = process.env.MYSQL_DATABASE;
module.exports.MYSQL_DATABASE_QUESTIONNAIRE = process.env.MYSQL_DATABASE_QUESTIONNAIRE;
module.exports.MYSQL_DATABASE_HOST = process.env.MYSQL_DATABASE_HOST;
module.exports.BACKEND_HOST = process.env.BACKEND_HOST;
module.exports.BACKEND_LISTENER_AUTH_TOKEN = process.env.BACKEND_LISTENER_AUTH_TOKEN;
module.exports.MYSQL_DATABASE_PORT = process.env.MYSQL_DATABASE_PORT;
// Config settings
module.exports.DOCUMENTS_PATH = process.env.DOCUMENTS_PATH;
module.exports.DOCTOR_PATH = process.env.DOCTOR_PATH;
module.exports.CHECKIN_URL = process.env.CHECKIN_URL;
module.exports.CHECKIN_ROOM = process.env.CHECKIN_ROOM;
module.exports.LAB_RESULT_HISTORY_URL = process.env.LAB_RESULT_HISTORY_URL;
module.exports.QUESTIONNAIRE_COMPLETED_URL = process.env.QUESTIONNAIRE_COMPLETED_URL;
module.exports.DEFAULT_LAB_EDUCATIONAL_URL_EN = process.env.DEFAULT_LAB_EDUCATIONAL_URL_EN;
module.exports.DEFAULT_LAB_EDUCATIONAL_URL_FR = process.env.DEFAULT_LAB_EDUCATIONAL_URL_FR;
module.exports.LATEST_STABLE_VERSION = process.env.LATEST_STABLE_VERSION;
// ORMS settings API
module.exports.ORMS_UPDATE_PATIENT_STATUS_URL = process.env.ORMS_UPDATE_PATIENT_STATUS_URL;
// SMTP settings
module.exports.SMTP_HOST = process.env.SMTP_HOST;
module.exports.SMTP_PORT = process.env.SMTP_PORT;
module.exports.SMTP_USERNAME = process.env.SMTP_USERNAME;
module.exports.SMTP_PASSWORD = process.env.SMTP_PASSWORD;
module.exports.SMTP_FROM = process.env.SMTP_FROM;
module.exports.SMTP_TLS_REJECTED_UNAUTHORIZED = process.env.SMTP_TLS_REJECTED_UNAUTHORIZED;
// OPAL EMAIL used in `mailer.js`
module.exports.OPAL_EMAIL=process.env.OPAL_EMAIL;
// SMTP IP and PORT used in `mailer.js`
module.exports.SMTP_SERVER_IP=process.env.SMTP_SERVER_IP;
module.exports.SMTP_SERVER_PORT=process.env.SMTP_SERVER_PORT;
