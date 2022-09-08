const admin = require("firebase-admin");
const config = require('../config-adaptor.js');
const cron = require('node-cron');
const logger = require('../../listener/logs/logger.js');
const queries = require('../api/sql/queries.js');
const sqlInterface = require('../api/sql/sqlInterface.js');

const registrationBranch = 'registration/branch';
const log = (level, message, data) => logger.log(level, `Registration-cron: ${message}`, data);

/**
 * @desc Launch a cron to delete expired registration branches once every minute.
 * @author Jinal Vyas, refactored by Stacey Beard
 */
function launchCron() {
    // Asterisks = default values, to run every minute. See: https://www.npmjs.com/package/node-cron
    log('info', 'Starting cron to delete expired Firebase branches');
    cron.schedule('* * * * *', deleteExpiredBranches);
}

/**
 * @desc Runs database queries to identify expired Firebase branches to delete, then deletes them.
 * @author Jinal Vyas, refactored by Stacey Beard
 */
async function deleteExpiredBranches() {
    log('verbose', 'Running deletion of expired firebase branches');

    log('debug', 'Flagging expired branches for deletion in the database')
    try {
        await flagFirebaseBranchesForDeletion();
    }
    catch (error) {
        log('error', 'An error occurred while flagging branches for deletion in the database', error);
    }

    let branchesToDelete = await getFirebaseBranchesToDelete();
    if (branchesToDelete.length === 0) {
        log('verbose', 'No branches to delete');
        return;
    }

    log('verbose', 'Deleting branches', branchesToDelete);
    let deletedBranches = await deleteFirebaseBranches(branchesToDelete);

    log('debug', 'Marking branches as deleted in the database');
    try {
        if (deletedBranches.length > 0) await markFirebaseBranchesAsDeleted(deletedBranches);
    }
    catch (error) {
        log('error', 'An error occurred while marking branches as deleted in the database', error);
    }
}

/**
 * @desc Deletes all firebase branches in the provided array.
 * @param {string[]} branches The names of the branches to delete
 * @returns {Promise<string[]>} The list of branches that were successfully deleted.
 * @author Jinal Vyas, refactored by Stacey Beard
 */
async function deleteFirebaseBranches(branches) {
    // allSettled - don't abort the deletion process if one branch causes errors
    let results = await Promise.allSettled(branches.map(branch => removeFirebaseRef(branch)));

    // Extract error information from the results (failed deletions)
    results.forEach((result, i) => {
        if (result.status === 'rejected') log('error', `Failed to delete branch: ${branches[i]}`, result.reason);
    });

    // Return the list of successfully deleted branches
    return results.flatMap((result, i) => result.status === 'fulfilled' ? [branches[i]] : [])
}

/**
 * @desc Deletes a branch reference from Firebase.
 * @param {string} firebaseBranch The name of the branch to delete.
 * @returns {Promise<any>} The Promise from the remove() operation.
 * @author Jinal Vyas, refactored by Stacey Beard
 */
function removeFirebaseRef(firebaseBranch) {
    const db = admin.database();
    log("verbose", "Deleting firebase branch", firebaseBranch);
    const ref = db.ref(getBranchPath(config.FIREBASE_ROOT_BRANCH, firebaseBranch));
    return ref.remove();
}

/**
 * @desc Returns the full path of a registration branch on Firebase.
 * @param {string} firebaseRoot The root branch used by this listener (usually from the config file).
 * @param {string} branchName The name of the Firebase 'branch' belonging to a user.
 * @returns {string} The full Firebase path to the given branch.
 */
function getBranchPath(firebaseRoot, branchName) {
    return `${firebaseRoot}${firebaseRoot.slice(-1) === '/' ? '' : '/'}${registrationBranch}/${branchName}`;
}

/**
 * @desc Runs through expired firebase branches in the database and flags them for deletion.
 * @returns {Promise}
 */
function flagFirebaseBranchesForDeletion() {
    return sqlInterface.runRegistrationSqlQuery(queries.flagFirebaseBranchesForDeletion());
}

/**
 * @desc Queries and returns all firebase branches marked for deletion in the database.
 * @returns {Promise<string[]>}
 */
async function getFirebaseBranchesToDelete() {
    let result = await sqlInterface.runRegistrationSqlQuery(queries.getFirebaseBranchesToDelete());
    return result.map(row => row.FirebaseBranch);
}

/**
 * @desc Marks as deleted in the database the firebase branches that were successfully deleted.
 * @param {string[]} branches The branches to mark as deleted.
 * @returns {Promise<*>}
 */
function markFirebaseBranchesAsDeleted(branches) {
    return sqlInterface.runRegistrationSqlQuery(queries.markFirebaseBranchesAsDeleted(), [[branches]]);
}

module.exports = {
    launchCron: launchCron,
    // For testing
    getBranchPath: getBranchPath,
};
