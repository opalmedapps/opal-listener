// SPDX-FileCopyrightText: Copyright 2016 Opal Health Informatics Group <info@opalmedapps.tld>
//
// SPDX-License-Identifier: AGPL-3.0-or-later

// Module that send emails using node mailer

'use strict';
const nodemailer = require('nodemailer');
const config = require('./../config-adaptor');

function Mail(){

    // create reusable transporter object using the default SMTP transport
    let transporter = nodemailer.createTransport({
        host: config.SMTP_SERVER_IP,
        port: config.SMTP_SERVER_PORT
    });

    // setup email data with unicode symbols

    this.sendMail = function (recipient, subject, text, replyEmail) {
        let mailOptions = {
            from: `Opal <${config.OPAL_EMAIL}>`, // sender address
            to: recipient, // list of receivers
            subject: subject, // Subject line
            text: text, // plain text body
            replyTo: replyEmail
        }

        transporter.sendMail(mailOptions, (error, info) => {
            if (error) {
                return console.log(error);
            }
            console.log('Message %s sent: %s', info.messageId, info.response);
        });
    };
// send mail with defined transport object

}

module.exports = Mail;

