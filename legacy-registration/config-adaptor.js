/**
 * @file Provides a bridge to selected configurations in the new config file, as well as values from the old config file.
 *       This file provides a single point of interaction with all necessary configurations, preventing the need to edit
 *       many references in old code to access configs in the new config file.
 * @author Stacey Beard
 */

const oldConfig = require('./config.json');
const newConfig = require('../src/config/config.json');

module.exports = oldConfig;

// Add selected configs from the new file
module.exports.FIREBASE_ADMIN_KEY = newConfig.FIREBASE.ADMIN_KEY_PATH;
module.exports.DATABASE_URL = newConfig.FIREBASE.DATABASE_URL;
module.exports.FIREBASE_ROOT_BRANCH = newConfig.FIREBASE.ROOT_BRANCH;
