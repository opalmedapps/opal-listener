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
