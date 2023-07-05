const nodemailer = require('nodemailer');

function sendMail(config, recipient, subject, text, html) {
    let transporter = nodemailer.createTransport({
        host: config.SMTP_HOST,
        port: config.SMTP_PORT,
        secure: config.SMTP_PORT === 465,
        auth: {
            user: config.SMTP_USERNAME,
            pass: config.SMTP_PASSWORD,
        },
        // Allow configuration of unauthorized CAs (such as self-signed certificates)
        // See: https://github.com/nodemailer/nodemailer/issues/406#issuecomment-83941225
        tls: {
            rejectUnauthorized: config.SMTP_TLS_REJECTED_UNAUTHORIZED,
        },
    });

    let message = {
        from: config.SMTP_FROM,
        to: recipient,
        subject: subject,
        text: text,
        html: html,
    };

    return transporter.sendMail(message);
}

module.exports = { sendMail };
