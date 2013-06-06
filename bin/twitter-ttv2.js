#!/usr/bin/env node
'use strict'; /*jslint es5: true, node: true */
var fs = require('fs');
var stream = require('stream');
var request = require('request');
var querystring = require('querystring');
var gzbz = require('gzbz/streaming');
var TimeoutDetector = require('../timeout');
var ttv = require('../ttv');

var argv = require('optimist').usage([
    'Usage: $0 --user chbrown --pass mypassword --query "track=bieber"',
    '',
    ' --user [USER]       twitter user',
    ' --pass [PASSWORD]   twitter password',
    ' --query [PASSWORD]  twitter API query',
    ' --file [-]          output target, defaults to STDOUT',
    ' --interval [600]    how long to wait before dying from boredom, in seconds',
    ' --timeout [NEVER]   die after NEVER seconds no matter what',
  ].join('\n'))
  .demand(['user', 'pass', 'query'])
  .default({interval: 600, file: '-'}).argv;

function die(exc) {
  console.error(exc.toString());
  // more or less doing what it's told, but we exit with 1 so that supervisord will restart us
  process.exit(1);
}

if (argv.timeout) {
  setTimeout(function() {
    die(new Error('Elapsed lifetime of ' + argv.timeout + 's.'));
  }, argv.timeout * 1000);
}

// pipeline works like:
// # curl | timeout detector | newline splitter | ttv2 | bzip2 | file

// 1. curl
var form = querystring.parse(argv.query);
form.stall_warnings = true;
var request_stream = request.post({
  url: 'https://stream.twitter.com/1.1/statuses/filter.json',
  form: form,
  auth: { user: argv.user, pass: argv.pass }
});
request_stream.on('error', die);

// 2. timeout: ensure we get something every x seconds.
var timeout_detector = new TimeoutDetector({timeout: argv.interval}); // timeout takes seconds
timeout_detector.on('error', die);

// 3. newline_splitter
// var newline_splitter = new Rebuffer({split: '\n'});
// newline_splitter.on('error', die);
// factor this into the JSONStoTweet transform, actually.

// 4. tweet consolidator
var jsons_to_tweet = new ttv.JSONStoTweet();
jsons_to_tweet.on('error', die);

// 5. ttv2 flattener
var tweet_to_ttv2 = new ttv.Tweet2TTV2();
tweet_to_ttv2.on('error', die);

// 6. bzip2 deflater
var bzip_stream = new gzbz.BzipDeflater({encoding: 'utf8', level: 9});
bzip_stream.on('error', die);

// 7. output (STDOUT / file)
var output = process.stdout;
if (argv.file != '-') {
  var timestamp = new Date().toISOString().replace(/:/g, '-').replace(/\..+/, '');
  var filepath = argv.file.replace(/TIMESTAMP/, timestamp);
  output = fs.createWriteStream(filepath, {flags: 'a', encoding: null, mode: '0664'});
}

// # hook it all together
request_stream
  .pipe(timeout_detector)
  .pipe(jsons_to_tweet)
  .pipe(tweet_to_ttv2)
  // .pipe(bzip_stream)
  .pipe(output);
