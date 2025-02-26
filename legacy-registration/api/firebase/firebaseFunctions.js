/**  Library Imports **/

const admin = require("firebase-admin");
const logger = require('../../logs/logger.js');
const Q = require('q');
const config = require('../../config-adaptor');


// Function to create firebase account
exports.createFirebaseAccount = function (userEmail, userPassword) {
	let r = Q.defer();

    admin.auth().createUser({
        email: userEmail,
        password: userPassword
    })
    .then(function (userRecord) {
        // Firebase account has been created and it returns the firebase unique ID
        logger.log('debug','Successfully created new firebase user account and this is the unique Id: ' + userRecord.uid);
        r.resolve(userRecord.uid);
    })
    .catch(function (error) {
        logger.log('error', 'Error while creating new user account in firebase: ' + error.code);
        r.reject(error.errorInfo);
    });

    return r.promise;
};

exports.deleteFirebaseAccount = function (uid) {
    let r = Q.defer();

    admin.auth().deleteUser(uid)
        .then(function () {
            logger.log('debug', 'Successfully delete the firebase account using passed uniqueID: ' + uid);
            r.resolve();
        })
        .catch(function (error) {
            logger.log('Error', 'Error while deleting user account in firebase' + error);
            r.reject();

        });
    return r.promise;

};
//const serviceAccount = require(config.FIREBASE_ADMIN_KEY);

//admin.initializeApp({
//    credential: admin.credential.cert(serviceAccount),
//    databaseURL: config.DATABASE_URL
//});

//// Enable firebase logging
//admin.database.enableLogging(false);

//// Get reference to correct data element
//const db = admin.database();
//const ref = db.ref(config.firebaseBranch.parentBranch);


//admin.auth().createUser({
//    email: 'test@test.com',
//    password: 'TEst'
//})
//    .then(function (userRecord) {
//        // Firebase account has been created and it returns the firebase unique ID
//        logger.log('debug', 'Successfully created new firebase user account and this is the unique Id: ' + userRecord.uid);
//        r.resolve(userRecord.uid);
//    })
//    .catch(function (error) {
//        logger.log('Error', 'Error while creating new user account in firebase' + error.code);
//        r.resolve(error.code);
//    });
