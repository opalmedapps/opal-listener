// SPDX-FileCopyrightText: Copyright 2020 Opal Health Informatics Group at the Research Institute of the McGill University Health Centre <john.kildea@mcgill.ca>
//
// SPDX-License-Identifier: AGPL-3.0-or-later

// Index for the module
module.exports = {
    'PatientTestTypes':  require("./request-handlers/patient-test-types.request-handler"),
    'PatientTestTypeResults':  require("./request-handlers/patient-test-type-results.request-handler"),
    'PatientTestDates':  require("./request-handlers/patient-test-collected-dates.request-handler"),
    'PatientTestDateResults':  require("./request-handlers/patient-test-collected-date-results.request-handler"),
};
