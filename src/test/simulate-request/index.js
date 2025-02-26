/* eslint-disable no-new */
/**
 * @file Upload a mock request to firebase to be picked up by the listener
 * @author David Gagne
 */
const path = require('path');
const fs = require('fs');
const config = require('../../config/config.json');
const { Firebase } = require('../../firebase/firebase');
const requestData = require('./mock-requests');
const legacyLogger = require('../../../listener/logs/logger');

class SimulateRequest {
    /**
     * @description App configuration needed to connect to firebase
     */
    #config;

    /**
     * @description Mocked request data
     */
    #requestData;

    constructor() {
        this.#config = config;
        this.#requestData = requestData;
        this.makeRequest();
    }

    /**
     * @description Get the firebase admin key from it's folder and trigger Firebase initialization.
     */
    makeRequest() {
        const pathName = path.join(__dirname, '../../config/firebase');
        fs.readdir(pathName, (err, files) => {
            if (err) throw new Error('Can\'t load firebase admin key');
            this.#config.FIREBASE.ADMIN_KEY_PATH = `${pathName}/${files[0]}`;
            this.initFirebase();
        });
    }

    /**
     * @description Init Firebase connection and trigger upload.
     */
    async initFirebase() {
        const firebase = new Firebase(this.#config.FIREBASE);
        await firebase.init();
        Firebase.enableLogging(this.#config.FIREBASE.ENABLE_LOGGING);
        this.#requestData.Timestamp = Firebase.getDatabaseTimeStamp;
        this.uploadToFirebase(firebase.getDataBaseRef);
    }

    /**
     * @description Upload the mock request to firebase db.
     * @param {object} databaseRef - Firebase database connection reference.
     */
    uploadToFirebase(databaseRef) {
        databaseRef.child('requests').push(this.#requestData).then(response => {
            legacyLogger.log('debug', `Firebase request push succes with key: ${response.key}`);
            process.exit();
        }).catch(error => {
            throw new Error(error);
        });
    }
}

new SimulateRequest();
