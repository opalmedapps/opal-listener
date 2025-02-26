const mysql             = require('mysql');
const filesystem        = require('fs');
const Q                 = require('q');
const queries           = require('./../sql/queries.js');
const config            = require('./../config.json');
const request           = require('request');
const Mail              = require('./../mailer/mailer.js');
const utility           = require('./../utility/utility');
const logger            = require('./../logs/logger');
const {OpalSQLQueryRunner} = require("../sql/opal-sql-query-runner");

// process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";

// require('https').globalAgent.options.ca = require('/etc/pki/tls/certs').create();

try {
    let r = Q.defer();
    request.post(config.CHECKIN_PATH, {
        json: true,
        body: {
            "mrn": "9999996",
            "site": "RVH",
            "room": "OPAL PHONE APP",
        },
    }, function(error, response, body) {
        logger.log('verbose', 'Checked into aria and medi - response: ' + JSON.stringify(response));
        logger.log('verbose', 'Checked into aria and medi - body: ' + JSON.stringify(body));

        if (error) throw error;
        else if (response.statusCode !== 200) throw (`Request returned with a response status other than '200 OK': status = ${response.statusCode}, body = ${JSON.stringify(body)}`);
        else r.resolve();
    });
}
catch(error){
    console.log(error);
}