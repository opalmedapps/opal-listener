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
module.exports.MYSQL_DATABASE_REGISTRATION = process.env.MYSQL_DATABASE_REGISTRATION;
module.exports.MYSQL_DATABASE_HOST = process.env.MYSQL_DATABASE_HOST;
module.exports.OPAL_BACKEND_HOST = process.env.OPAL_BACKEND_HOST;
module.exports.MYSQL_DATABASE_PORT = process.env.MYSQL_DATABASE_PORT;
// Config settings
module.exports.DOCUMENTS_PATH = process.env.DOCUMENTS_PATH;
module.exports.DOCTOR_PATH = process.env.DOCTOR_PATH;
module.exports.CHECKIN_PATH = process.env.CHECKIN_PATH;
module.exports.CHECKIN_ROOM = process.env.CHECKIN_ROOM;
module.exports.LAB_RESULT_HISTORY = process.env.LAB_RESULT_HISTORY;
module.exports.QUESTIONNAIRE_COMPLETED_PATH = process.env.QUESTIONNAIRE_COMPLETED_PATH;
module.exports.MYSQL_DATABASE_REGISTRATION = process.env.MYSQL_DATABASE_REGISTRATION;
module.exports.LATEST_STABLE_VERSION = process.env.LATEST_STABLE_VERSION;
// ORMS settings API
module.exports.ORMS_API_URL = process.env.ORMS_API_URL;
module.exports.ORMS_API_method_updatePatientStatus = process.env.ORMS_API_method_updatePatientStatus;
// SMTP settings
module.exports.SMTP_host = process.env.SMTP_host;
module.exports.SMTP_port = process.env.SMTP_port;
module.exports.SMTP_username = process.env.SMTP_username;
module.exports.SMTP_password = process.env.SMTP_password;
module.exports.SMTP_from = process.env.SMTP_from;
module.exports.SMTP_tls_reject_unauthorized = process.env.SMTP_tls_reject_unauthorized;
