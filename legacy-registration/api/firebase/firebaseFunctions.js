// SPDX-FileCopyrightText: Copyright 2020 Opal Health Informatics Group at the Research Institute of the McGill University Health Centre <john.kildea@mcgill.ca>
//
// SPDX-License-Identifier: AGPL-3.0-or-later

import admin from 'firebase-admin';
import logger from '../../logs/logger.js';

// Function to create firebase account
async function createFirebaseAccount(userEmail, userPassword) {
    const response = await admin.auth().createUser({
        email: userEmail,
        password: userPassword
    });
    if (response?.uid) {
        logger.log('debug',`Successfully created new firebase user account and this is the unique Id: ${response.uid}`);
    }
    return response?.uid;
}

// Function to get firebase account by email
async function getFirebaseAccountByEmail(userEmail) {
    const response = await admin.auth().getUserByEmail(userEmail);
    if (response?.uid) {
        logger.log('debug', `Successfully got firebase user account and this is the unique Id: ${response.uid}`);
    }
    return response?.uid;
}

// Function to get firebase account by encoded login id token
async function getFirebaseAccountByIdToken(idToken) {
    const response = await admin.auth().verifyIdToken(idToken);
    if (response?.uid) {
        logger.log('debug', `Successfully got firebase user account and this is the unique Id: ${response.uid}`);
    }
    return response;
}

export default {
    createFirebaseAccount,
    getFirebaseAccountByEmail,
    getFirebaseAccountByIdToken,
}
