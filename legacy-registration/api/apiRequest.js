/**  Library Imports **/

const apiFunctionRequest = require('../api/apiFunctions.js');
const logger = require('../logs/logger.js');


const API = {
    'RegisterPatient': apiFunctionRequest.registerPatient,
    'CheckEmailExistsInFirebase': apiFunctionRequest.checkEmailExistsInFirebase,
    'IsCaregiverAlreadyRegistered': apiFunctionRequest.isCaregiverAlreadyRegistered,
};

/**
     processRequest
     @desc Maps the incoming requestObject to the correct API function to handle it
     @param requestObject
     @return {Promise}
 **/
exports.processRequest = async function (requestObject) {
    const type = requestObject.Request;

    if (!API.hasOwnProperty(type)) {
        throw { Response: 'error', Reason: `Invalid request type: ${type}` };
    }

    logger.log('debug', `Processing request of type: ${type}`);
    try {
        return await API[type](requestObject);
    }
    catch (error) {
        logger.log('error', error);
        throw { Response: 'error', Reason: error };
    }
};
