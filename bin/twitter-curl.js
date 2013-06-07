#!/usr/bin/env node
'use strict'; /*jslint es5: true, node: true */
var fs = require('fs');
var request = require('request');
var querystring = require('querystring');
var TimeoutDetector = require('../timeout');
var tweet = require('../tweet');
var sv = require('sv');
var gzbz = require('gzbz/streaming');

var argv = require('optimist').usage([
    'Usage: $0 --user chbrown --pass mypassword --query "track=bieber"',
    '',
    ' --user [USER]       twitter user',
    ' --pass [PASSWORD]   twitter password',
    ' --query [PASSWORD]  twitter API query',
    ' --file [-]          output target, defaults to STDOUT',
    ' --interval [600]    how long to wait before dying from boredom, in seconds',
    ' --timeout [NEVER]   die after NEVER seconds no matter what',
    ' --ttv2              convert to TTV2 (json by default)'
  ].join('\n')).boolean('ttv2')
  .demand(['user', 'pass', 'query'])
  .alias({u: 'user', username: 'user', screenname: 'user', p: 'pass', pw: 'pass', password: 'pass'})
  .default({interval: 600, file: '-'}).argv;

function die(exc) {
  console.error(exc.toString());
  // more or less doing what it's told, but we exit with 1 so that supervisord will restart us
  // console.error('EXIT 1');
  process.exit(1);
}

if (argv.timeout) {
  setTimeout(function() {
    die(new Error('Elapsed lifetime of ' + argv.timeout + 's.'));
  }, argv.timeout * 1000);
}

// pipeline works like:
// # curl | timeout detector | split on newlines and normalize tweet | ttv2 | [bzip2] | file / stdout

// 1. curl
var form = querystring.parse(argv.query);
form.stall_warnings = true;
var request_stream = request.post({
  url: 'https://stream.twitter.com/1.1/statuses/filter.json',
  form: form,
  auth: { user: argv.user, pass: argv.pass }
});
request_stream.on('error', die);
request_stream.on('response', function(response) {
  if (response.statusCode != 200) {
    response.pipe(process.stdout);
    die(new Error('HTTP Error ' + response.statusCode));
  }
});


// 2. timeout: ensure we get something every x seconds.
var timeout_detector = new TimeoutDetector({timeout: argv.interval}); // timeout takes seconds
timeout_detector.on('error', die);

// 3. tweet consolidator -- handles the Buffer->utf8 conversion
var jsons_to_tweet = new tweet.JSONStoTweet();
jsons_to_tweet.on('error', die);

// 4. ttv2 flattener
var columns = ['id', 'created_at', 'text', 'coordinates', 'place_id', 'place_str',
    'in_reply_to_status_id', 'in_reply_to_screen_name', 'retweet_id',
    'retweet_count', 'user_screen_name', 'user_id', 'user_created_at',
    'user_name', 'user_description', 'user_location', 'user_url',
    'user_statuses_count', 'user_followers_count', 'user_friends_count',
    'user_favourites_count', 'user_geo_enabled', 'user_default_profile',
    'user_time_zone', 'user_lang', 'user_utc_offset'];
var tweet_to_ttv2 = new sv.Stringifier({
  columns: columns,
  encoding: 'utf8',
  missing: '',
  delimiter: '\t'
});
tweet_to_ttv2.on('error', die);

// 5. bzip2 deflater
// var bzip_stream = new gzbz.BzipDeflater({encoding: 'utf8', level: 9});
// bzip_stream.on('error', die);

// 6. destination (STDOUT / file)
var destination = process.stdout;
if (argv.file != '-') {
  var timestamp = new Date().toISOString().replace(/:/g, '-').replace(/\..+/, '');
  var filepath = argv.file.replace(/TIMESTAMP/, timestamp);
  destination = fs.createWriteStream(filepath, {flags: 'a', encoding: null, mode: '0664'});
}
destination.on('error', die);

// # hook it all together
var outlet = request_stream.pipe(timeout_detector);
if (argv.ttv2) {
  outlet = outlet.pipe(jsons_to_tweet).pipe(tweet_to_ttv2);
}
// outlet = outlet.pipe(bzip_stream)
outlet.pipe(destination);
