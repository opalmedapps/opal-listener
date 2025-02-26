/**  Library Imports **/

const admin = require("firebase-admin");
const logger = require('../../logs/logger.js');
const Q = require('q');
const config = require('../../config-adaptor');


// Function to create firebase account
exports.createFirebaseAccount = async function (userEmail, userPassword) {
    const response = await admin.auth().createUser({
        email: userEmail,
        password: userPassword
    });
    return response?.uid;
};

// Function to create firebase account
exports.getFirebaseAccountByEmail = async function (userEmail) {
    const response = await admin.auth().getUserByEmail(userEmail)
    return response?.uid;
};

exports.deleteFirebaseAccount = async function (uid) {
    await admin.auth().deleteUser(uid)
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
