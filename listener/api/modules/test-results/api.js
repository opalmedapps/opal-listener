// SPDX-FileCopyrightText: Copyright 2020 Opal Health Informatics Group at the Research Institute of the McGill University Health Centre <john.kildea@mcgill.ca>
//
// SPDX-License-Identifier: AGPL-3.0-or-later

import PatientTestTypes from './request-handlers/patient-test-types.request-handler.js';
import PatientTestTypeResults from './request-handlers/patient-test-type-results.request-handler.js';
import PatientTestDates from './request-handlers/patient-test-collected-dates.request-handler.js';
import PatientTestDateResults from './request-handlers/patient-test-collected-date-results.request-handler.js';

export default {
    PatientTestTypes,
    PatientTestTypeResults,
    PatientTestDates,
    PatientTestDateResults,
}
