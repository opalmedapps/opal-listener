const requestUtility    = require("../../../../../utility/request-utility");

class HospitalParking {
    /**
     * @param {string} hospitalKey
     * @param {string} language
     */
    constructor(hospitalKey, language) {
        this._hospitalKey = hospitalKey;
        this._language = language.toLowerCase();
    }

    /**
     * @author Anton Gladyr
     * @date 2022-04-01
     * @description Fetches parking site's url.
     * @returns {Promise<Object>}
     */
    async getParkingSiteUrl() {

        //TODO: fix - store url in a config file
        let url = 'http://127.0.0.1:8000/api/hospital-settings/institutions/';

        // let options = {
        //     'Accept': 'application/json',
        //     'Accept-Charset': 'utf-8',
        //     'Accept-Language': 'fr'
        // };

        let options = {
            'headers': {
                'Accept': 'application/json',
                'Accept-Charset': 'utf-8',
                'Accept-Language': this._language
            }
        };

        let { response, body } = await requestUtility.request("get", url, options);

        //TODO: add body validation
        return JSON.parse(body);
    }
}

module.exports = {HospitalParking};