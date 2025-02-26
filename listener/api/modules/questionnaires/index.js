// SPDX-FileCopyrightText: Copyright 2022 Opal Health Informatics Group at the Research Institute of the McGill University Health Centre <john.kildea@mcgill.ca>
//
// SPDX-License-Identifier: AGPL-3.0-or-later

// Partial index of requests used by sqlInterface's requestMappings
module.exports = {
    'QuestionnaireList': require('./request-handlers/questionnaire-list.request-handler.js'),
    'QuestionnaireListSingle': require('./request-handlers/questionnaire-list-single.request-handler.js'),
};
