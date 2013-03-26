#!/usr/bin/env node
'use strict'; /*jslint es5: true, node: true */
var fs = require('fs');
var request = require('request');
var querystring = require('querystring');

var last_data = Date.now();

var argv = require('optimist').
  usage('Usage: $0 --user chbrown --pass mypassword --query "track=bieber"').
  demand(['user', 'pass', 'query']).
  default('interval', 600).default('file', '-').argv;

//   --file is optional, and if provided, will be used as the output filepath
//      if --file is not specified, output will be sent to standard out.
//   --interval defaults to 10 minutes, and describes how long the script will wait for new
//      data before dying. --interval is time in integer seconds.

var out = process.stdout;
if (argv.file != '-') {
  var timestamp = new Date().toISOString().replace(/:/g, '-').replace(/\..+/, '');
  var filepath = argv.file.replace(/TIMESTAMP/, timestamp);
  out = fs.createWriteStream(filepath, {flags: 'a', encoding: null, mode: '0664'});
}


var form = querystring.parse(argv.query);
form.stall_warnings = true;
var req = request.post({
  url: 'https://stream.twitter.com/1.1/statuses/filter.json',
  form: form,
  auth: { user: argv.user, pass: argv.pass }
});

req.on('data', function(d) {
  last_data = Date.now();
  out.write(d);
});
req.on('error', function(e) {
  console.error(e);
});

// ensure we get something every x seconds.
var interval_ms = argv.interval * 1000;
setInterval(function() {
  if (last_data < (Date.now() - interval_ms)) {
    console.error('INTERVAL');
    // or DIE if we don't get something, hahahaha.
    // Hopefully you've got supervisord configured.
    process.exit(1);
  }
}, interval_ms);

if (argv.timeout) {
  setTimeout(function() {
    console.error('TIMEOUT');
    // more or less doing what it's told, but we exit with 1 so that supervisord will restart us
    process.exit(1);
  }, argv.timeout * 1000);
}
