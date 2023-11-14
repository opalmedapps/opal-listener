const expect = require('chai').expect;
const nodemailer = require('nodemailer');

const { sendMail } = require('./mail');

describe('sendmail()', function () {
  // sending takes longer than the default timeout of 2000ms
  this.timeout(5000);

  it('should fail if there is no config', async function () {
    try {
      await sendMail({}, 'test', 'test', 'test');
      throw new Error('was not supposed to be succeed');
    }
    catch (error) {
      // Check that the error contains 'Error: connect ECONNREFUSED' string
      // Note that `nodemailer.createTransport()` method uses native `dns.resolve()` nodejs method
      // Starting from nodejs v17, `dns.resolve()` method resolves host names to IPv6
      // Please see:
      //  - https://nodejs.org/api/dns.html#dnsresolvehostname-rrtype-callback
      //  - https://nodejs.org/api/dns.html#dnssetdefaultresultorderorder
      //  - https://nodemailer.com/smtp/
      expect(error.toString()).to.include('Error: connect ECONNREFUSED');
    }
  });

  it('should send an email successfully', async function () {
    // create test account for etheral.email
    let testAccount = await nodemailer.createTestAccount();

    let result = await sendMail({
      SMTP_HOST: testAccount.smtp.host,
      SMTP_PORT: testAccount.smtp.port,
      SMTP_USERNAME: testAccount.user,
      SMTP_PASSWORD: testAccount.pass,
      SMTP_FROM: 'Opal sendmail test <test@opalmedapps.ca>',
    }, 'test@opalmedapps.ca', 'test', 'test email');

    // verify that the response code is 250
    expect(result.response).to.be.a('string').and.satisfy(response => response.startsWith('250'));
  });

  it('should send an email with HTML body successfully', async function () {
    // create test account for etheral.email
    let testAccount = await nodemailer.createTestAccount();

    let result = await sendMail({
      SMTP_HOST: testAccount.smtp.host,
      SMTP_PORT: testAccount.smtp.port,
      SMTP_USERNAME: testAccount.user,
      SMTP_PASSWORD: testAccount.pass,
      SMTP_FROM: 'Opal sendmail test <test@opalmedapps.ca>',
    }, 'test@opalmedapps.ca', 'test', 'test email', '<b>html test</b>');

    // verify that the response code is 250
    expect(result.response).to.be.a('string').and.satisfy(response => response.startsWith('250'));
  });
});
