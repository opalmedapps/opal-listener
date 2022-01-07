const {ApiRequestHandler} = require("../../../../api-request-handler");
const {HospitalParking} = require("../classes/hospital-parking");
const logger = require("../../../../../logs/logger");

class HospitalParkingRequestHandler extends ApiRequestHandler {
    /**
     * Handler for the ParkingInfo request, returns parking sites related to a given hospital
     * @param {OpalRequest} requestObject
     * @returns {Promise<{data: {site: string, url: string}}>}
     */
    static async handleRequest(requestObject){
        logger.log("info", `Requesting parking information from the Python API using the following ${requestObject.parameters['hospitalKey']} hospitalKey and ${requestObject.parameters['language']} language`);

        const hospitalParking = new HospitalParking(
            requestObject.parameters['patientSerNum'],
            requestObject.parameters['institutionCode'],
            requestObject.parameters['language']
        );

        return {
            "data": await hospitalParking.getParkingSiteUrls()
        }
    }
}

module.exports = HospitalParkingRequestHandler;