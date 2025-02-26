/**  Library Imports **/
const queries = require('../sql/queries.js');
const { OpalSQLQueryRunner } = require('../../../listener/sql/opal-sql-query-runner');


exports.runOpaldbSqlQuery = (...args) => OpalSQLQueryRunner.run(...args);

let formatParameterSex = sex => {
    if (sex === 'F') return 'Female';
    if (sex === 'M') return 'Male';
    if (sex === 'O' || sex === 'X') return 'Other';
    return 'Unknown';
}

/**
 insertPatient
 @desc insert a patient record.
 @param requestObject
 @param {boolean} isSelfRelationship Whether the user is registering for a "self" relationship.
 @return {Promise}
 **/
exports.insertPatient = async function (requestObject) {
    let parameters = requestObject.Parameters.Fields;
    let result = await exports.runOpaldbSqlQuery(queries.insertPatient(), [
        parameters.firstName,
        parameters.lastName,
        formatParameterSex(parameters.sex),
        parameters.dateOfBirth,
        parameters.dateOfBirth,
        // Note: the email is filled out in a later step
        '',
        // Note: if a parent is registering for their child, the parent's language is saved. Can always be changed later if the child registers too.
        parameters.language.toUpperCase(),
        parameters.ramq,
        parameters.accessLevel,
    ]);
    if (!result?.insertId) throw "Failed to insert patient record; no insertId was returned";
    return result.insertId;
};

/**
 @description Inserts a dummy row in the Patient table, used for Caregivers who don't have a self relationship.
 @return {Promise}
 **/
exports.insertDummyPatient = async function (firstName, lastName, email, language) {
    let result = await exports.runOpaldbSqlQuery(queries.insertDummyPatient(), [
        firstName,
        lastName,
        email,
        language.toUpperCase(),
    ]);
    if (!result?.insertId) throw "Failed to insert patient record; no insertId was returned";
    return result.insertId;
};

/**
 * @description Inserts a row into the Users table, using information from the registering user.
 * @param {string} username The user's Firebase username.
 * @param {string} password The user's password, hashed.
 * @param {number} patientSerNum The user's "self" PatientSerNum in the database.
 */
exports.insertUser = async function (username, password, patientSerNum) {
    let result = await exports.runOpaldbSqlQuery(queries.insertUser(), [patientSerNum, username, password]);
    if (!result?.insertId) throw "Failed to insert user record; no insertId was returned";
    return result.insertId;
}

/**
 * @description Updates the fields relevant to the "self" user in the Patient table.
 * @param requestObject The request object.
 * @param selfPatientSerNum The SerNum representing the user's "self" row in the Patient table.
 * @returns {Promise<*>}
 */
exports.updateSelfPatient = function (requestObject, selfPatientSerNum) {
    let fields = requestObject.Parameters.Fields;
    return exports.runOpaldbSqlQuery(queries.updateSelfPatientInfo(), [
        fields.email,
        fields.language.toUpperCase(),
        fields.phone,
        fields.accessLevel,
        fields.termsandAggreementSign,
        selfPatientSerNum,
    ]);
}

exports.initializePatientControl = function (patientSerNum) {
    return exports.runOpaldbSqlQuery(queries.insertPatientControl(), [patientSerNum]);
}

/**
 insertPatientHospitalIdentifier
 @desc insert a patient hospital identifier record.
 @param requestObject
 @return {Promise}
 **/
exports.insertPatientHospitalIdentifier = function (requestObject) {
    let parameters = requestObject.Parameters.Fields;
    return exports.runOpaldbSqlQuery(queries.insertPatientHospitalIdentifier(), [
        parameters.patientSerNum,
        parameters.mrn,
        parameters.site,
    ]);
};

/**
 * Finds the Patient row associated with a Users row, and returns its PatientSerNum.
 * @param userSerNum The UserSerNum to look up in Users.
 * @returns {*}
 */
exports.getPatientSerNumFromUserSerNum = async function(userSerNum) {
    let rows = await exports.runOpaldbSqlQuery(queries.getPatientSerNumFromUserSerNum(), [userSerNum]);
    return rows[0].PatientSerNum;
};
