const {ApiRequestHandler} = require("../../../../api-request-handler");
const {HospitalParking} = require("../classes/hospital-parking");
const logger = require("../../../../../logs/logger");

class HospitalParkingRequestHandler extends ApiRequestHandler {
    /**
     * Handler for the ParkingInfo request, returns parking url related to a given hospital
     * @param {OpalRequest} requestObject
     * @returns {Promise<{data: {site: string, url: string}}>}
     */
    static async handleRequest(requestObject){
        logger.log("info", `Requesting parking information from the Python API using the following hospitalKey: ${requestObject.parameters['hospitalKey']}`);

        const hospitalParking = new HospitalParking(requestObject.parameters['hospitalKey']);

        return {
            "data": await hospitalParking.getParkingSiteUrl()
        }

        // return {
        //     "data": {
        //         "site": "site_name",
        //         "url": requestObject.parameters['hospitalKey']
        //     }
        // };
    }
}

module.exports = HospitalParkingRequestHandler;