/**
 * Reuse the SSL handling from the legacy listener to avoid reuse by copy-paste.
 */
module.exports = require('../../listener/security/ssl.js')
