// eslint-disable-next-line max-len
// SPDX-FileCopyrightText: Copyright 2022 Opal Health Informatics Group at the Research Institute of the McGill University Health Centre <john.kildea@mcgill.ca>
//
// SPDX-License-Identifier: AGPL-3.0-or-later

const REQUEST_TYPE = {
    API: 'api',
    LEGACY: 'requests',
    REGISTRATION: 'registration-api/requests',
    REGISTRATION_LEGACY: 'registration/requests',
};

const REGISTER_SEARCH_REQUEST_REGEX = /^\/api\/registration\/[a-zA-Z0-9]{12}\/$/;

module.exports = {
    REQUEST_TYPE,
    REGISTER_SEARCH_REQUEST_REGEX,
};
