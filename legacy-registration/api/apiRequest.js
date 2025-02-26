/**  Library Imports **/

const apiFunctionRequest = require('../api/apiFunctions.js');
const logger = require('../logs/logger.js');

const Q = require('q');


const API = {
    'InsertIPLog': apiFunctionRequest.insertIPLog,
    'ValidateIP': apiFunctionRequest.validateIP,
    'ValidateInputs': apiFunctionRequest.validateInputs,
    'SecurityQuestionsList': apiFunctionRequest.getSecurityQuestionsList,
    'AccessLevelList': apiFunctionRequest.getAccessLevelList,
    'LanguageList': apiFunctionRequest.getLanguageList,
    'TermsandAggreementDocuments': apiFunctionRequest.getTermsandAgreementDocuments,
    'RegisterPatient': apiFunctionRequest.registerPatient,
    'GetPatientInfo': apiFunctionRequest.getPatientInfo,
};

/**
     processRequest
     @desc Maps the incoming requestObject to the correct API function to handle it
     @param requestObject
     @return {Promise}
 **/
exports.processRequest = function (requestObject) {
    
    const r = Q.defer();
    const type = requestObject.Request;

    if (API.hasOwnProperty(type)) {
        logger.log('debug', 'Processing request of type: ' + type);
        return API[type](requestObject);
    } else {
        logger.log('error', 'Invalid request type: ' + type);
        r.reject('Invalid request type');
    }
    
    return r.promise;
};
