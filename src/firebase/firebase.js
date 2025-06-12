// eslint-disable-next-line max-len
// SPDX-FileCopyrightText: Copyright 2022 Opal Health Informatics Group at the Research Institute of the McGill University Health Centre <john.kildea@mcgill.ca>
//
// SPDX-License-Identifier: AGPL-3.0-or-later

/**
 * @file Manages the connection to a Firebase realtime database.
 */

import { param, ValidationChain, Validator } from '../utility/param-validator.js';
import admin from 'firebase-admin';

class Firebase {
    /**
     * @description Reference to the Firebase database represented by this object.
     *              Only available after running the init function.
     */
    database;

    /**
     * @description Path to treat as the root of the Firebase database as used by this listener.
     *              Only available after running the init function.
     * @type {string}
     */
    root = '';

    /**
     * @description Configuration object used to instantiate the connection to the Firebase database.
     * @type {object}
     */
    #config;

    /**
     * @description Validators used on the config object attribute when running the init function.
     * @type {ValidationChain[]}
     */
    static #configValidators = [
        param('DATABASE_URL').exists().isURL(),
        param('ADMIN_KEY_PATH').exists(),
        param('ROOT_BRANCH').exists(),
    ];

    /**
     * @description Creates an object that instantiates and provided a reference to a Firebase realtime database.
     * @param {object} config - Object used to initialize and configure the Firebase database connection.
     */
    constructor(config) {
        this.#config = config;
    }

    /**
     * @description Initializes the connection to the Firebase database represented by the config attribute.
     * @returns {Promise<void>} Rejects with an error if any of the provided options in the config attribute
     *                          are invalid.
     */
    async init() {
        await Validator.validate(this.#config, Firebase.#configValidators);

        // Load the Firebase service account configurations from the admin key file
        const serviceAccount = this.#config.ADMIN_KEY_PATH;

        const firebaseDBObject = admin.initializeApp({
            credential: admin.credential.cert(serviceAccount),
            databaseURL: this.#config.DATABASE_URL,
        });

        this.database = firebaseDBObject.database();
        // verify that the connection was successful
        await firebaseDBObject.database().getRules();

        // Save the root branch in a variable for easy access
        this.root = this.#config.ROOT_BRANCH;
    }

    /**
     * @returns {object} Getter for Firebase database reference.
     */
    get getDataBaseRef() {
        return this.database.ref(this.root);
    }

    /**
     * @returns {object} Getter for Firebase server time representation
     */
    static get getDatabaseTimeStamp() {
        return admin.database.ServerValue.TIMESTAMP;
    }

    /**
     * @description Enables or disables Firebase logging.
     * @param {boolean} value - True to enable logging; false to disable it.
     */
    static enableLogging(value) {
        // TODO See if this function can be made non-static with logging enabled only for the current DB
        admin.database.enableLogging(value);
    }
}

export default Firebase;
