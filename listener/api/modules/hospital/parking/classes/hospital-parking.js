const requestUtility    = require("../../../../../utility/request-utility");

class HospitalParking {
    /**
     * @param hospitalKey
     */
    constructor(hospitalKey) {
        this._hospitalKey = hospitalKey;
    }

    /**
     * @author Anton Gladyr
     * @date 2022-04-01
     * @description Fetches parking site's url.
     * @returns {Promise<Object>}
     */
    async getParkingSiteUrl() {

        //TODO: fix - store url in a config file
        let url = 'http://127.0.0.1:8000/api/hospital-settings/sites/';

        let options = {
            'Accept': 'application/json',
            'Accept-Charset': 'utf-8'
        };

        let { response, body } = await requestUtility.request("get", url, options);

        return body;
    }
}

module.exports = {HospitalParking};