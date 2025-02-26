// const request = require('request');

// request('https://api.nasa.gov/planetary/apod?api_key=DEMO_KEY', { json: true }, (err, res, body) => {
// // request('https://www.google.com', { json: true }, (err, res, body) => {
//   if (err) { return console.log(err); }
//   console.log(body.url);
//   console.log(body.explanation);
// });

const wsDirname = '/etc/ssl/certs';
const config            = require('./../config.json');

const fs = require('fs')
    , path = require('path')
    , certFile = path.resolve(wsDirname, 'ca-bundle.trust.crt')
    // , keyFile = path.resolve(wsDirname, 'ssl/client.key')
    , caFile = path.resolve(wsDirname, 'ca-bundle.crt')
    , request = require('request');

const options = {
    url: config.CHECKIN_PATH,
    cert: fs.readFileSync(certFile),
    // key: fs.readFileSync(keyFile),
    // passphrase: 'password',
    ca: fs.readFileSync(caFile),
    json: true,
    body: {
        "mrn": "9999996",
        "site": "RVH",
        "room": "OPAL PHONE APP",
    }
};

request.post(options, (err, res, body) => {
// request('https://www.google.com', { json: true }, (err, res, body) => {
  if (err) { throw error }
  console.log(res);
  console.log(body);
  if (body && body.url) console.log(body.url);
  if (body && body.explanation) console.log(body.explanation);
});