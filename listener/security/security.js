var sqlInterface=require('./../api/sqlInterface.js');
var q = require('q');
var utility=require('./../utility/utility.js');
const logger            = require('./../logs/logger');

var exports=module.exports={};
const FIVE_MINUTES = 300000;

exports.resetPasswordRequest=function(requestKey, requestObject)
{

    var r=q.defer();
    var responseObject = {};
    //Get the patient fields to verify the credentials

    sqlInterface.getPatientFieldsForPasswordReset(requestObject).then(function(patient){
        //Check for injection attacks by the number of rows the result is returning
        if(patient.length>1||patient.length === 0)
        {
            responseObject = { Headers:{RequestKey:requestKey,RequestObject:requestObject}, Code: 2, Data:{},Response:'error', Reason:'Injection attack, incorrect Email'};
            r.resolve(responseObject);
        }else{
            //If the request is not erroneous simply direct the request to appropriate function based on the request mapping object
            requestMappings[requestObject.Request](requestKey, requestObject,patient[0]).then(function(response){
                r.resolve(response);
            });
        }
    }).catch(function(error){
        //If there is an error with the queries reply with an error message
        responseObject = { Headers:{RequestKey:requestKey,RequestObject:requestObject}, Code: 2, Data:{},Response:'error', Reason: error+""};
        r.resolve(responseObject);
    });
    return r.promise;

};

exports.verifySecurityAnswer=function(requestKey,requestObject,patient)
{
    var r = q.defer();
    var key = patient.AnswerText;


    logger.log('debug', 'in verify security answer');
    logger.log('debug', 'patient: ' + JSON.stringify(patient));
    //TO VERIFY, PASS SECURITY ANSWER THROUGH HASH THAT TAKES A WHILE TO COMPUTE, SIMILAR TO HOW THEY DO PASSWORD CHECKS
    // utility.generatePBKDFHash(key,key);

    if(patient.TimeoutTimestamp != null && requestObject.Timestamp - (new Date(patient.TimeoutTimestamp)).getTime() > FIVE_MINUTES) {
        logger.log('debug', 'resetting security answer attempt');
	    sqlInterface.resetSecurityAnswerAttempt(requestObject);
    } else if(patient.Attempt == 5) {
        //If 5 attempts have already been made, lock the user out for 5 minutes
	    if(patient.TimeoutTimestamp == null) sqlInterface.setTimeoutSecurityAnswer(requestObject, requestObject.Timestamp);
        r.resolve({Code: 4, RequestKey:requestKey, Data:"Attempted security answer more than 5 times, please try again in 5 minutes", Headers:{RequestKey:requestKey,RequestObject:requestObject}, Response:'error'});
        return r.promise;
    }

    //Wrap decrypt in try-catch because if error is caught that means decrypt was unsuccessful, hence incorrect security answer

    let unencrypted = null;

    logger.log('debug', 'decrypting');

    utility.decrypt(requestObject.Parameters, key)
        .then(params => {

            logger.log('debug', 'params: ' + JSON.stringify(params));

            unencrypted = params;

            //If its the right security answer, also make sure is a valid SSN;
            var response = {};

            var ssnValid = unencrypted.SSN && unencrypted.SSN.toUpperCase() === patient.SSN && unencrypted.Answer && unencrypted.Answer === patient.AnswerText;
            var answerValid = unencrypted.Answer === patient.AnswerText;
            var isVerified = false;

            if(unencrypted.PasswordReset){
                isVerified = ssnValid;
            } else {
                isVerified = answerValid;
            }

            if (isVerified) {
                response = { RequestKey:requestKey, Code:3,Data:{AnswerVerified:"true"}, Headers:{RequestKey:requestKey,RequestObject:requestObject},Response:'success'};
                sqlInterface.setTrusted(requestObject)
                    .then(function(){
                        sqlInterface.resetSecurityAnswerAttempt(requestObject);
                        r.resolve(response);
                    })
                    .catch(function(error){
                        r.reject({ Headers:{RequestKey:requestKey,RequestObject:requestObject}, Code: 2, Data:{},Response:'error', Reason:'Could not set trusted device'});
                    })

            } else {
                response = { RequestKey:requestKey, Code:3,Data:{AnswerVerified:"false"}, Headers:{RequestKey:requestKey,RequestObject:requestObject},Response:'success'};
                r.resolve(response);
            }

        })
        .catch((err) => {
            //Check if timestamp for lockout is old, if it is reset the security answer attempts
            logger.log('error', 'increase security answer attempt due to error decrypting', err);
            sqlInterface.increaseSecurityAnswerAttempt(requestObject);
            r.resolve({ RequestKey:requestKey, Code:3,Data:{AnswerVerified:"false"}, Headers:{RequestKey:requestKey,RequestObject:requestObject},Response:'success'});
        });

    return r.promise;
};

exports.setNewPassword=function(requestKey, requestObject, user)
{
    var r=q.defer();
    var ssn = user.SSN.toUpperCase();
    var answer = user.AnswerText;

    utility.decrypt(requestObject.Parameters, utility.hash(ssn), answer)
        .then((unencrypted)=> {
            sqlInterface.setNewPassword(utility.hash(unencrypted.newPassword), user.UserTypeSerNum).then(function(){
                logger.log('debug', 'successfully updated password');
                var response = { RequestKey:requestKey, Code:3, Data:{PasswordReset:"true"}, Headers:{RequestKey:requestKey,RequestObject:requestObject},Response:'success'};
                r.resolve(response);
            }).catch(function(error){
                logger.log('error', 'error updating password', error);

                var response = { Headers:{RequestKey:requestKey,RequestObject:requestObject}, Code: 2, Data:{},Response:'error', Reason:'Could not set password'};
                r.resolve(response);
            });
        }).catch(err => r.reject(err));

    return r.promise;
};

exports.securityQuestion=function(requestKey,requestObject) {
    let r = q.defer();

    let unencrypted = null;
    return utility.decrypt(requestObject.Parameters, utility.hash("none"))
        .then((params) => {
            unencrypted = params;

            logger.log('debug', 'Unencrypted: ' + JSON.stringify(unencrypted));

            let email = requestObject.UserEmail;
            let password = unencrypted.Password;

            //Then this means this is a login attempt
            if (password) {
                return getSecurityQuestion(requestKey, requestObject, unencrypted).then(function (response) {
                    logger.log('debug', 'Successfully got security question with response: ' + JSON.stringify(response));
                    return response
                });
            } else {
                //Otherwise we are dealing with a password reset
                return getSecurityQuestion(requestKey, requestObject, unencrypted);
            }

        });
};

function getSecurityQuestion(requestKey, requestObject, unencrypted){

    let r = q.defer();

    requestObject.Parameters = unencrypted;

    logger.log('debug', 'in get security question with: ' + requestObject);

    sqlInterface.updateDeviceIdentifier(requestObject)
        .then(function () {
            logger.log('debug', 'finished updating device identifier');
            return sqlInterface.getSecurityQuestion(requestObject)
        })
        .then(function (response) {
            logger.log('debug', 'updated device id successfully');

            r.resolve({
                Code:3,
                Data:response.Data,
                Headers:{RequestKey:requestKey,RequestObject:requestObject},
                Response:'success'
            });
        })
        .catch(function (response){
            logger.log('debug', 'error updating device id');
            r.resolve({
                Headers:{RequestKey:requestKey,RequestObject:requestObject},
                Code: 2,
                Data:{},
                Response:'error',
                Reason:response
            });
        });

    return r.promise;
}

var requestMappings = {
    'SetNewPassword':exports.setNewPassword,
    'VerifyAnswer':exports.verifySecurityAnswer
};
