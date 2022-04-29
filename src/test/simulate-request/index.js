/* eslint-disable no-new */
/**
 * @file Upload a mock request to firebase to be picked up by the listener
 *       This file need to be run inside the docker container using the command:
 *       `docker exec -it opal-listener npm run simulateRequest`
 *       Mock request data is located in `./mock-request.js`
 * @author David Gagne
 */
const path = require('path');
const fs = require('fs');
const config = require('../../config/config.json');
const { Firebase } = require('../../firebase/firebase');
const requestData = require('./mock-request');
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
     * User sernum use for testing purpose only.
     */
    #testUserSerNum = 51;

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
     * @description Init Firebase connection and trigger upload, add Firebase server timespamp, trigger firebase upload.
     */
    async initFirebase() {
        const firebase = new Firebase(this.#config.FIREBASE);
        await firebase.init();
        await this.encriptRequest();
        this.#requestData.Timestamp = Firebase.getDatabaseTimeStamp;
        this.uploadToFirebase(firebase.getDataBaseRef);
    }

    /**
     * @description Encrypt mock request using listener encryption utilities.
     */
    async encriptRequest() {
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

    /**
     * @param {number} userSerNum - Test user sernum.
     * @returns {object} The latest deviceID used to login and the related security question answer for encryption.
     */
    static getQuery(userSerNum) {
        return `
            SELECT
                PDI.DeviceId,
                SA.AnswerText
            FROM
                PatientDeviceIdentifier PDI,
                SecurityAnswer SA
            WHERE
                PDI.PatientSerNum = ${userSerNum}
            AND
                PDI.SecurityAnswerSerNum = SA.SecurityAnswerSerNum
            ORDER BY PDI.LastUpdated DESC
            LIMIT 1
        `;
    }
}

new SimulateRequest();
