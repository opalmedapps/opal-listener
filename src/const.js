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
