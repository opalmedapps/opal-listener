// SPDX-FileCopyrightText: Copyright 2026 Opal Health Informatics Group at the Research Institute of the McGill University Health Centre <john.kildea@mcgill.ca>
//
// SPDX-License-Identifier: AGPL-3.0-or-later

/**
 * @description Helper function that clones an object.
 * @param {object} obj The object to clone (must be parsable by JSON.stringify).
 * @returns {object} The cloned copy of the object.
 */
function clone(obj) {
    return JSON.parse(JSON.stringify(obj));
}

export {
    clone,
};
