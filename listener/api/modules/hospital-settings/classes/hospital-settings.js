const requestUtility         = require("../../../../utility/request-utility");
const config                 = require('../../../../config.json');
const sqlInterface = require('../../../sqlInterface.js');
const logger                 = require("../../../../logs/logger");

class HospitalSettings {
    /**
     * @param {string} patientSerNum
     * @param {string} institutionCode
     * @param {string} language
     */
    constructor(patientSerNum, institutionCode, language) {
        this._patientSerNum = patientSerNum;
        this._institutionCode = institutionCode;
        this._language = language.toLowerCase();
    }

    /**
     * @author Anton Gladyr
     * @date 2022-04-01
     * @description Fetch the patient's hospital-settings identifiers' (site codes) from the Opal database
     * @returns {Promise<Object>}
     */
    async getInfo() {
        let patientHospitalIdentifiers;

        try {
            // list of hospital-settings-identifier objects
            patientHospitalIdentifiers = await sqlInterface.getMRNs(this._patientSerNum);
        } catch (err) {
            logger.log("error", "Could not obtain patient's hospital-settings site list: ", err);
            throw err;
        }

        // list of hospital-settings identifiers (site codes)
        // e.g. ['siteCode1', 'siteCode2', 'siteCode3']
        const siteCodeList = patientHospitalIdentifiers.map( code => code.Hospital_Identifier_Type_Code );

        // internal hospital-settings-settings API endpoint
        const endpointUrl = config.NEW_OPAL_ADMIN.HOST +
            config.NEW_OPAL_ADMIN.API_ENDPOINTS.SITES;

        // request parameters
        const options = {
            "qs": {
                "code__in": siteCodeList.join(),
                "institution__code__iexact": this._institutionCode
            },
            "headers": {
                "Authorization": "Token " + config.NEW_OPAL_ADMIN.AUTH_TOKEN,
                "Accept": "application/json",
                "Accept-Charset": "utf-8",
                "Accept-Language": this._language
            }
        };

        let { response, body } = await requestUtility.request("get", endpointUrl, options);

        return JSON.parse(body);
    }
}

module.exports = {HospitalSettings};
