// SPDX-FileCopyrightText: Copyright 2016 Opal Health Informatics Group at the Research Institute of the McGill University Health Centre <john.kildea@mcgill.ca>
//
// SPDX-License-Identifier: AGPL-3.0-or-later

// Module that send emails using node mailer

import config from '../config-adaptor.js';
import nodemailer from 'nodemailer';

function Mail(){

    // create reusable transporter object using the default SMTP transport
    let transporter = nodemailer.createTransport({
        host: config.FEEDBACK_EMAIL_HOST,
        port: config.FEEDBACK_EMAIL_PORT
    });

    // setup email data with unicode symbols

    this.sendMail = function (recipient, subject, text, replyEmail) {
        let mailOptions = {
            from: `Opal <${config.FEEDBACK_EMAIL}>`, // sender address
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

export default Mail;
