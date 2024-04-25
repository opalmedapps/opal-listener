/**  Library Imports **/

const admin = require("firebase-admin");
const logger = require('../../logs/logger.js');


// Function to create firebase account
exports.createFirebaseAccount = async function (userEmail, userPassword) {
    const response = await admin.auth().createUser({
        email: userEmail,
        password: userPassword
    });
    if (response?.uid) {
        logger.log('debug',`Successfully created new firebase user account and this is the unique Id: ${response.uid}`);
    }
    return response?.uid;
};

// Function to get firebase account by email
exports.getFirebaseAccountByEmail = async function (userEmail) {
    const response = await admin.auth().getUserByEmail(userEmail);
    if (response?.uid) {
        logger.log('debug', `Successfully got firebase user account and this is the unique Id: ${response.uid}`);
    }
    return response?.uid;
};

// Function to get firebase account by encoded login id token
exports.getFirebaseAccountByIdToken = async function (idToken) {
    const response = await admin.auth().verifyIdToken(idToken);
    if (response?.uid) {
        logger.log('debug', `Successfully got firebase user account and this is the unique Id: ${response.uid}`);
    }
    return response?.uid;
};
