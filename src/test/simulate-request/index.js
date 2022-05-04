/* eslint-disable no-new */
/**
 * @file Upload a mock request to firebase to simulate a request from the app.
 * @author David Gagne
 */
const path = require('path');
const mysql = require('mysql');
const fs = require('fs');
const config = require('../../config/config.json');
const { Firebase } = require('../../firebase/firebase');
const DefaultRequestData = require('./mock-request');
const legacyLogger = require('../../../listener/logs/logger');
const legacyOpalSqlRunner = require('../../../listener/sql/opal-sql-query-runner');
const legacyUtility = require('../../../listener/utility/utility');

class SimulateRequest {
    /**
     * @description App configuration needed to connect to firebase
     */
    #config;

    /**
     * @description Mocked request data
     */
    #requestData;

    /**
     * @description User sernum use for testing purpose only.
     */
    #testUserSerNum = 51;

    /**
     * @description Firebase manager instance use for uploading and set timestamp.
     */
    #firebase;

    /**
     * @param {object} requestData  Mock request to be encrypt and upload to firebase. Simulate a app request
     * @description Upload a mock request to firebase to be picked up by the listener
     *              This file need to be run inside the docker container using the command:
     *              `docker exec -it opal-listener npm run simulateRequest`
     *              It can also be use for in tests scripts using the instanciation of the class
     *              and passing the desired mock request
     *              `new SimulateRequest(DefaultRequestData);`
     *              Mock request data is located in `./mock-request.js`
     */
    constructor(requestData) {
        this.#config = config;
        this.#requestData = requestData;
        this.#requestData.Timestamp = Firebase.getDatabaseTimeStamp;
        this.makeRequest();
    }

    /**
     * @description Steps to encrypt and upload a request to Firebase.
     *              1- Get the firebase admin key file path
     *              2- Init the Firebase manager
     *              3- Encrypt the data as the app would do
     *              4- Upload the result to Firebase
     */
    async makeRequest() {
        this.#config.FIREBASE.ADMIN_KEY_PATH = await SimulateRequest.getFirebaseAdminKey();
        await this.initFirebase();
        await this.encryptRequest();
        this.uploadToFirebase();
    }

    /**
     * @description Scan "config/firebase" directory and return the admin key file path.
     * @returns {object} File path for the firebase admin key.
     */
    static async getFirebaseAdminKey() {
        const pathName = path.join(__dirname, '../../config/firebase');
        const files = await fs.promises.readdir(pathName);
        return `${pathName}/${files[0]}`;
    }

    /**
     * @description Init Firebase connection and trigger upload, add Firebase server timespamp, trigger firebase upload.
     */
    async initFirebase() {
        this.#config.FIREBASE.ADMIN_KEY_PATH = await SimulateRequest.getFirebaseAdminKey();
        this.#firebase = new Firebase(this.#config.FIREBASE);
        await this.#firebase.init();
    }

    /**
     * @description Encrypt mock request using listener encryption utilities.
     */
    async encryptRequest() {
        const sqlResponse = await legacyOpalSqlRunner.OpalSQLQueryRunner.run(
            SimulateRequest.getQuery(this.#testUserSerNum),
        );
        const hash = legacyUtility.hash(this.#requestData.UserID);
        const secret = sqlResponse[0].AnswerText;
        const encryptedData = await legacyUtility.encrypt(
            {
                request: this.#requestData.Request,
                params: this.#requestData.Parameters,
            },
            hash,
            secret,
        );

        this.#requestData = {
            ...this.#requestData,
            Request: encryptedData.request,
            Parameters: encryptedData.params,
            DeviceId: sqlResponse[0].DeviceId,
        };
    }

    /**
     * @description Upload the mock request to firebase db. Which trigger the listener's pipeline.
     */
    uploadToFirebase() {
        this.#firebase.getDataBaseRef.child('requests').push(this.#requestData).then(response => {
            legacyLogger.log('debug', `Firebase request push succes with key: ${response.key}`);
            process.exit();
        }).catch(error => {
            throw new Error(error);
        });
    }

    /**
     * @param {number} userSerNum - Test user sernum.
     * @returns {object} The latest deviceID used to login and the related security question answer for encryption.
     */
    static getQuery(userSerNum) {
        return mysql.format(`
            SELECT
                PDI.DeviceId,
                SA.AnswerText
            FROM
                PatientDeviceIdentifier PDI,
                SecurityAnswer SA
            WHERE
                PDI.PatientSerNum = ?
            AND
                PDI.SecurityAnswerSerNum = SA.SecurityAnswerSerNum
            ORDER BY PDI.LastUpdated DESC
            LIMIT 1
        `, [userSerNum]);
    }
}

// Create a new instance with a default mock request to be able to run the script via a npm command
new SimulateRequest(DefaultRequestData);

exports.SimulateRequest = SimulateRequest;
