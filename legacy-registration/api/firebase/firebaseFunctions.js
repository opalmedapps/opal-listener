/**  Library Imports **/

const admin = require("firebase-admin");

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
