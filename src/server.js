/**
 * @file Entry point used to launch the listener.
 * @author David Herrera, Robert Maglieri, Stacey Beard
 */

require('dotenv').config();

const {
    ENVIRONMENT, ENVIRONMENT_CHECKIN, ENVIRONMENT_ORMS, FIREBASE_CONFIG, validateEnvironment,
} = require('./environment');
const { Firebase } = require('./firebase/firebase');
const legacyServer = require('../listener/legacy-server');
const legacyRegistrationServer = require('../legacy-registration/legacy-server');
const legacyLogger = require('../listener/logs/logger');
const { RequestHandler } = require('./core/request-handler');
const { REQUEST_TYPE } = require('./const');
const { Version } = require('./utility/version');

// Raise AssertionError if environment variables are not set
validateEnvironment(ENVIRONMENT);

if (ENVIRONMENT.ORMS_ENABLED) {
    validateEnvironment(ENVIRONMENT_ORMS);
}

if (ENVIRONMENT.SOURCE_SYSTEM_SUPPORTS_CHECKIN) {
    validateEnvironment(ENVIRONMENT_CHECKIN);
}

launch().then(() => {
    legacyLogger.log('info', 'LISTENER LAUNCHED SUCCESSFULLY');
}).catch(error => {
    legacyLogger.log('error', 'FAILED TO LAUNCH', error);
    process.exit(1);
});

/**
 * @description Initializes the listener by connecting to Firebase and starting to listen for requests
 *              on certain branches.
 * @returns {Promise<void>}
 */
async function launch() {
    legacyLogger.log('info', `LISTENER VERSION: ${Version.getListenerVersion()}`);
    const firebase = new Firebase(FIREBASE_CONFIG);

    await firebase.init();
    Firebase.enableLogging(FIREBASE_CONFIG.FIREBASE_ENABLE_LOGGING);

    legacyLogger.log('debug', 'Setting Firebase request listeners');

    const requestHandler = new RequestHandler(firebase);
    // Still need pass the database reference to make the legacy-server work for the moment
    legacyServer.setFirebaseConnection(firebase.getDataBaseRef);
    legacyServer.listenForRequest('requests');
    legacyServer.listenForRequest('passwordResetRequests');

    requestHandler.listenForRequests(REQUEST_TYPE.API);
    requestHandler.listenForRequests(REQUEST_TYPE.REGISTRATION);

    legacyRegistrationServer.setFirebaseConnection(firebase);
    legacyRegistrationServer.listenForRequest('requests');

    legacyServer.spawnCronJobs();

    // const {OpalSQLQueryRunner} = require("../listener/sql/opal-sql-query-runner");

    // try {
    //     let results = await OpalSQLQueryRunner.run(`
    //     SELECT DISTINCT CONCAT(CollectedDateTime, ' EST') as collectedDateTime
    //     FROM
    //         PatientTestResult as ptr,
    //         TestExpression as te,
    //         /* TestControl: only aliased lab results are sent to the app */
    //         TestControl as tc
    //     WHERE
    //         ptr.PatientSerNum = 51
    //         AND ptr.TestExpressionSerNum = te.TestExpressionSerNum
    //         AND te.TestControlSerNum = tc.TestControlSerNum
    //         AND tc.PublishFlag = 1
    //         /* use the AvailableAt column to determine if the lab result is available to be viewed by the patient */
    //         AND ptr.AvailableAt <= NOW()
    //     ORDER BY collectedDateTime DESC;
    //     `);

    //     console.log(results);
    // } catch (err) {
    //     legacyLogger.log("error", `SQL: could not obtain tests for patient `, err);
    // }

    // let datetime = new Date('2024-01-01 00:00:00 GMT-0700');
    // console.log(datetime);

    // console.log(Intl.DateTimeFormat().resolvedOptions().timeZoneName);
    // const admin = require("firebase-admin");
    // let result = await admin.auth().verifyIdToken('eyJhbGciOiJSUzI1NiIsImtpZCI6IjJkOWI0ZTY5ZTMyYjc2MTVkNGNkN2NhZmI4ZmM5YjNmODFhNDFhYzAiLCJ0eXAiOiJKV1QifQ.eyJpc3MiOiJodHRwczovL3NlY3VyZXRva2VuLmdvb2dsZS5jb20vb3BhbC10ZXN0LTI0ZWJjIiwiYXVkIjoib3BhbC10ZXN0LTI0ZWJjIiwiYXV0aF90aW1lIjoxNzE0MTU1NTA1LCJ1c2VyX2lkIjoiUVhtejVBTlZOM1FwOWt0TWxxbTJ0SjJZWUJ6MiIsInN1YiI6IlFYbXo1QU5WTjNRcDlrdE1scW0ydEoyWVlCejIiLCJpYXQiOjE3MTQxNTU1MDUsImV4cCI6MTcxNDE1OTEwNSwiZW1haWwiOiJtYXJnZUBvcGFsbWVkYXBwcy5jYSIsImVtYWlsX3ZlcmlmaWVkIjpmYWxzZSwiZmlyZWJhc2UiOnsiaWRlbnRpdGllcyI6eyJlbWFpbCI6WyJtYXJnZUBvcGFsbWVkYXBwcy5jYSJdfSwic2lnbl9pbl9wcm92aWRlciI6InBhc3N3b3JkIn19.fbUlNcfIXrXGZ6K-cVK-rDDvrCIzwJSKO7Orl5ojREwK1kOz6TipaIw2O-Y8rqsfWXQWVhqCWD-PcK3V8lRFDJNOW9YOjrWdYecUvg1y2PWMM4ZS1iO8smuo-uQ1ZCf4GYxvygOIzzTZ60ph5wrKw5T9oB16gpUmu98OKIIWAH005j45Q_V4os-hxQOfx4AHWCxbiR1Xhm7QJwxN1-HrAymDdoCVAySfLIHRJW2x-JkdHurVqEXby8HT5E94L0tpHBZ4OPaOMIlTchN-Mivu_4ntIrwUjmHmlagZh1619CWcA4WzADl9IQAWoXuQ4H3S4SqyxBMkmY2Mo-o-8fH5CQ');
    // console.log(result);
}
