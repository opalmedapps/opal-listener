// eslint-disable-next-line max-len
// SPDX-FileCopyrightText: Copyright 2022 Opal Health Informatics Group at the Research Institute of the McGill University Health Centre <john.kildea@mcgill.ca>
//
// SPDX-License-Identifier: AGPL-3.0-or-later

/* eslint-disable no-new */
/**
 * @file Upload a mock request to firebase to simulate a request from the app.
 */
import 'dotenv/config';
import mysql from 'mysql';
import Firebase from '../../firebase/firebase.js';
import DefaultRequestData from './mock-request.js';
import legacyLogger from '../../../listener/logs/logger.js';
import legacyOpalSqlRunner from '../../../listener/sql/opal-sql-query-runner.js';
import legacyUtility from '../../../listener/utility/utility.js';
import EncryptionUtilities from '../../encryption/encryption.js';
import { REQUEST_TYPE } from '../../const.js';
import RequestContext from '../../core/request-context.js';

const firebaseConfig = {
    DATABASE_URL: process.env.FIREBASE_DATABASE_URL,
    ADMIN_KEY_PATH: process.env.FIREBASE_ADMIN_KEY_PATH,
    ROOT_BRANCH: process.env.FIREBASE_ROOT_BRANCH,
    ENABLE_LOGGING: process.env.FIREBASE_ENABLE_LOGGING === 'true',
};

class SimulateRequest {
    /**
     * @description App configuration needed to connect to firebase
     */
    #firebaseConfig;

    /**
     * @description Mocked request data
     */
    #requestData;

    /**
     * @description User's Firebase UID used for testing purposes only.
     */
    #testUsername = process.env.TEST_ACCOUNT_FIREBASE_UID;

    /**
     * @description Firebase manager instance use for uploading and set timestamp.
     */
    #firebase;

    /**
     * Type of request to send to either legacy using 'request',
     * registration using 'registration-api' or new structure using 'api' which is the default value.
     */
    #requestType = REQUEST_TYPE.API;

    /**
     * @param {object} requestData  Mock request to be encrypt and upload to firebase. Simulate a app request
     * @description Upload a mock request to firebase to be picked up by the listener
     *              This file need to be run inside the docker container using the command:
     *              `docker exec -it opal-listener npm run simulateRequest`
     *              It can also be use for in tests scripts using the instantiation of the class
     *              and passing the desired mock request
     *              `new SimulateRequest(DefaultRequestData);`
     *              Mock request data is located in `./mock-request.js`
     */
    constructor(requestData) {
        if (!this.#testUsername) throw new Error('TEST_ACCOUNT_FIREBASE_UID must be set in the .env file');
        this.#firebaseConfig = firebaseConfig;
        this.#requestData = requestData;
        this.#requestData.Timestamp = Firebase.getDatabaseTimeStamp;
        if (this.#requestData.Request === REQUEST_TYPE.REGISTRATION) this.#requestType = REQUEST_TYPE.REGISTRATION;
        else if (this.#requestData.RequestType) this.#requestType = REQUEST_TYPE[this.#requestData.RequestType];
        this.makeRequest();
    }

    /**
     * @description Steps to encrypt and upload a request to Firebase.
     *              1- Init the Firebase manager
     *              2- Encrypt the data as the app would do
     *              3- Upload the result to Firebase
     */
    async makeRequest() {
        await this.initFirebase();
        if (this.#requestType === REQUEST_TYPE.REGISTRATION || this.#requestType === REQUEST_TYPE.REGISTRATION_LEGACY) {
            await this.encryptRegistrationRequest();
        }
        else {
            await this.encryptApiRequest();
        }
        this.uploadToFirebase();
    }

    /**
     * @description Init Firebase connection and trigger upload, add Firebase server timespamp, trigger firebase upload.
     */
    async initFirebase() {
        this.#firebase = new Firebase(this.#firebaseConfig);
        await this.#firebase.init();
    }

    /**
     * @description Encrypt mock request for registration.
     */
    async encryptRegistrationRequest() {
        const encryptedData = await legacyUtility.encrypt(
            new RequestContext(REQUEST_TYPE[this.#requestData.RequestType], this.#requestData),
            {
                request: this.#requestData.Request,
                params: this.#requestData.Parameters,
            },
            this.#requestData.SimulatedEncryption.secret,
            this.#requestData.SimulatedEncryption.salt,
        );
        delete this.#requestData.SimulatedEncryption;

        this.#requestData = {
            ...this.#requestData,
            Request: encryptedData.request,
            Parameters: encryptedData.params,
        };
    }

    /**
     * @description Encrypt mock request using listener encryption utilities.
     */
    async encryptApiRequest() {
        const sqlResponse = await legacyOpalSqlRunner.OpalSQLQueryRunner.run(
            SimulateRequest.getDeviceIdAndAnswer(this.#testUsername),
        );
        const hash = EncryptionUtilities.hash(this.#requestData.UserID);
        const secret = sqlResponse[0].SecurityAnswer;
        const encryptedData = await legacyUtility.encrypt(
            new RequestContext(REQUEST_TYPE[this.#requestData.RequestType], this.#requestData),
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
        this.#firebase.getDataBaseRef.child(this.#requestType).push(this.#requestData).then(response => {
            legacyLogger.log('debug', `Firebase request push success with key: ${response.key}`);
            process.exit();
        }).catch(error => {
            throw new Error(error);
        });
    }

    /**
     * @description Query that returns the most recent device ID and associated security answer for a given user.
     * @param {string} username The Firebase UID of the user.
     * @returns {object} The latest deviceID used to login and the related security question answer for encryption.
     */
    static getDeviceIdAndAnswer(username) {
        return mysql.format(`
            SELECT
                PDI.DeviceId,
                PDI.SecurityAnswer
            FROM
                PatientDeviceIdentifier PDI
            WHERE
                PDI.Username = ?
            ORDER BY PDI.LastUpdated DESC
            LIMIT 1
        `, [username]);
    }
}

// Create a new instance with a default mock request to be able to run the script via a npm command
new SimulateRequest(DefaultRequestData.requestRegistrationApi);

export default SimulateRequest;
