// SPDX-FileCopyrightText: Copyright 2022 Opal Health Informatics Group at the Research Institute of the McGill University Health Centre <john.kildea@mcgill.ca>
//
// SPDX-License-Identifier: AGPL-3.0-or-later

import QuestionnaireList from './request-handlers/questionnaire-list.request-handler.js';
import QuestionnaireListSingle from './request-handlers/questionnaire-list-single.request-handler.js';

// Partial index of requests used by sqlInterface's requestMappings
export default {
    QuestionnaireList,
    QuestionnaireListSingle,
}
