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
      expect(error.toString()).to.equal('Error: connect ECONNREFUSED 127.0.0.1:587');
    }
  });

  it('should send an email successfully', async function () {
    // create test account for etheral.email
    let testAccount = await nodemailer.createTestAccount();

    let result = await sendMail({
      host: testAccount.smtp.host,
      port: testAccount.smtp.port,
      username: testAccount.user,
      password: testAccount.pass,
      from: 'Opal sendmail test <test@opalmedapps.ca>',
    }, 'test@opalmedapps.ca', 'test', 'test email');

    // verify that the response code is 250
    expect(result.response).to.be.a('string').and.satisfy(response => response.startsWith('250'));
  });

  it('should send an email with HTML body successfully', async function () {
    // create test account for etheral.email
    let testAccount = await nodemailer.createTestAccount();

    let result = await sendMail({
      host: testAccount.smtp.host,
      port: testAccount.smtp.port,
      username: testAccount.user,
      password: testAccount.pass,
      from: 'Opal sendmail test <test@opalmedapps.ca>',
    }, 'test@opalmedapps.ca', 'test', 'test email', '<b>html test</b>');

    // verify that the response code is 250
    expect(result.response).to.be.a('string').and.satisfy(response => response.startsWith('250'));
  });
});
