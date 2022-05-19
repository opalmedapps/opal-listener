const nodemailer = require('nodemailer');

function sendMail(config, recipient, subject, text) {
    let transporter = nodemailer.createTransport({
        host: config.host,
        port: config.port,
        secure: config.port === 465,
        auth: {
            user: config.username,
            pass: config.password,
        },
        // Allow configuration of unauthorized CAs (such as self-signed certificates)
        // See: https://github.com/nodemailer/nodemailer/issues/406#issuecomment-83941225
        tls: {
            rejectUnauthorized: config.tls_reject_unauthorized,
        },
    });

    let message = {
        from: config.from,
        to: recipient,
        subject: subject,
        text: text,
    };

    return transporter.sendMail(message);
}

module.exports = { sendMail };
