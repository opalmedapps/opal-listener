/* eslint-disable no-console */
/**
 * @file Utility for Firebase to initialize users.
 * @author Matthias Schoettle
 */
/* eslint-disable import/no-unresolved */
const { getAuth } = require('firebase-admin/auth');

const { FIREBASE_CONFIG } = require('../environment');
const { Firebase } = require('./firebase');

/**
 * @description Deletes all Firebase users.
 * @returns {Promise<void>} Rejects with an error if listing or deleting Firebase users fails.
 */
async function deleteAllUsers() {
    // avoid recursion with async/await here and get the max possible number of users
    // to support any number of users the following can be adapted using async/await
    // https://dev.to/pratik14/deleting-all-firebase-users-l4d
    const userRecords = await getAuth().listUsers(1000);
    const uids = userRecords.users.map(userRecord => userRecord.uid);

    await getAuth().deleteUsers(uids);
    console.log('Deleted all users');
}

/**
 * @description Creates a defined list of new Firebase users.
 * @returns {Promise<void>}
 */
async function createUsers() {
    const userRecords = [
        {
            email: 'marge@opalmedapps.ca',
            password: '12345Opal!!',
            uid: 'QXmz5ANVN3Qp9ktMlqm2tJ2YYBz2',
        },
        {
            email: 'homer@opalmedapps.ca',
            password: '12345Opal!!',
            uid: 'PyKlcbRpMLVm8lVnuopFnFOHO4B3',
        },
        {
            email: 'bart@opalmedapps.ca',
            password: '12345Opal!!',
            uid: 'SipDLZCcOyTYj7O3C8HnWLalb4G3',
        },
        {
            email: 'mona@opalmedapps.ca',
            password: '12345Opal!!',
            uid: '61DXBRwLCmPxlaUoX6M1MP9DiEl1',
        },
        {
            email: 'fred@opalmedapps.ca',
            password: '12345Opal!!',
            uid: 'ZYHAjhNy6hhr4tOW8nFaVEeKngt1',
        },
        {
            email: 'laurie@opalmedapps.ca',
            password: '12345Opal!!',
            uid: 'a51fba18-3810-4808-9238-4d0e487785c8',
        },
        // A user registered at another institution
        {
            email: 'apptest+ned@opalmedapps.ca',
            password: '12345Opal!!',
            uid: '9wajsHGHaMUdDIcepyUJkm4O1pG3',
        },
        {
            email: 'rory@opalmedapps.ca',
            password: '12345Opal!!',
            uid: 'mouj1pqpXrYCl994oSm5wtJT3In2',
        },
    ];

    for (const user of userRecords) {
        try {
            // eslint-disable-next-line no-await-in-loop
            const userRecord = await getAuth().createUser(user);
            console.log('Successfully created new user:', userRecord.email);
        }
        catch (error) {
            console.log('Error creating new user:', error);
        }
    }
}

/**
 * @description Delete all Firebase users and create a pre-defined list of new users.
 * @returns {Promise<void>} Rejects with an error if any error occurs
 */
async function run() {
    const firebase = new Firebase(FIREBASE_CONFIG);
    await firebase.init();

    await deleteAllUsers();
    await createUsers();
    process.exit(0);
}

run();
