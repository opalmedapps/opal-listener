const {HospitalParkingQuery} = require("../queries/hospital-parking.queries");
const requestUtility         = require("../../../../../utility/request-utility");
const {OpalSQLQueryRunner}   = require("../../../../../sql/opal-sql-query-runner");
const config                 = require('./../../../../../config.json');
const logger                 = require("../../../../../logs/logger");

class HospitalParking {
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
     * @description Fetch the patient's hospital identifiers' (site codes) from the Opal database
     * @returns {Promise<Object>}
     */
    async getParkingSiteUrls() {
        const query = HospitalParkingQuery.getPatientHospitalIdentifiers(this._patientSerNum);
        let patientHospitalIdentifiers;

        try {
            // list of hospital-identifier objects
            patientHospitalIdentifiers = await OpalSQLQueryRunner.run(query);
        } catch (err) {
            logger.log("error", "SQL: could not obtain patient's hospital site list", err);
            throw err;
        }

        // list of hospital identifiers (site codes)
        // e.g. ['siteCode1', 'siteCode2', 'siteCode3']
        const siteCodeList = patientHospitalIdentifiers.map( code => code.Hospital_Identifier_Type_Code );

        // internal hospital-settings API endpoint
        const endpointUrl = config.SETTINGS_API_BACKEND.URL_ROOT +
            config.SETTINGS_API_BACKEND.API_ENDPOINTS.SITES;

        // request parameters
        const options = {
            "qs": {
                "code__in": siteCodeList.join(),
                "institution__code__iexact": this._institutionCode
            },
            "headers": {
                "Accept": "application/json",
                "Accept-Charset": "utf-8",
                "Accept-Language": this._language
            }
        };

        let { response, body } = await requestUtility.request("get", endpointUrl, options);

        return JSON.parse(body);
    }
}

module.exports = {HospitalParking};