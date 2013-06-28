#!/usr/bin/env node
'use strict'; /*jslint es5: true, node: true */
var fs = require('fs');
var request = require('request');
var querystring = require('querystring');
var TimeoutDetector = require('../timeout');
var tweet = require('../tweet');
var sv = require('sv');
// var gzbz = require('gzbz/streaming');

var argv = require('optimist').usage([
    'Usage: twitter-curl --filter "track=bieber"',
    '',
    ' --accounts ~/.twitter  filepath of twitter oauth csv',
    ' --filter "track=lmao"  twitter API query',
    ' --file -               output target (- means STDOUT)',
    ' --interval 600         die after a silence of 10 minutes',
    ' --timeout 21600        die after 6 hours, no matter what (defaults to never)',
    ' --ttv2                 convert to TTV2 (defaults to false, meaning JSON)',
    ' --verbose              print setup config',
  ].join('\n'))
  .alias({v: 'verbose'})
  .boolean(['ttv2', 'verbose'])
  .default({
    interval: 600,
    file: '-',
    accounts: '~/.twitter'
  }).argv;

function die(exc) {
  // more or less doing what it's told
  // but we exit with 1 so that supervisord will restart us
  if (argv.verbose) {
    console.error(exc.toString());
  }
  throw exc;
  // process.exit(1);
}

if (argv.timeout) {
  setTimeout(function() {
    die(new Error('Elapsed lifetime of ' + argv.timeout + 's.'));
  }, argv.timeout * 1000);
}

// pipeline works like:
// prereq 1: get account info
// prereq 2: hard reset timeout (optional)
// curl | timeout detector | split on newlines and normalize tweet | ttv2 | file / stdout
sv.Parser.readToEnd(argv.accounts, {encoding: 'utf8'}, function(err, accounts) {
  var account = accounts[Math.random() * accounts.length | 0];
  // e.g., account = {
  //   screen_name: 'leoparder',
  //   consumer_key: 'ziurk0AOdn71U63Yp9EG4',
  //   consumer_secret: 'VKmTsGrk2JjH4qcYFpaAX5iEDthoW7ZyeU03NxPS1ld',
  //   access_token: '915051675-bCH2SYP6Ok9epWwnu7A0DhrlIQBMUaoLtxVzfRG5',
  //   access_token_secret: 'VcLOIzA0mkiCSbUYDWrNv3n86EXJa4HQKMgqfd7' }
  var oauth = {
    consumer_key: account.consumer_key,
    consumer_secret: account.consumer_secret,
    token: account.access_token,
    token_secret: account.access_token_secret,
  };

  if (argv.verbose) {
    console.error('Using OAuth: ' + JSON.stringify(oauth));
  }

  // 1a. http request
  var outlet;
  if (argv.filter) {
    var form = querystring.parse(argv.filter);
    form.stall_warnings = true;
    outlet = request.post('https://stream.twitter.com/1.1/statuses/filter.json', {form: form, oauth: oauth});
  }
  else {
    outlet = request.get('https://stream.twitter.com/1.1/statuses/sample.json', {oauth: oauth});
  }

  // 1b. http response
  outlet.on('response', function(response) {
    if (response.statusCode != 200) {
      response.on('end', function() {
        die(new Error('HTTP Error ' + response.statusCode));
      }).pipe(process.stderr);
    }
  }).on('error', die);

  // 2. timeout: ensure we get something every x seconds.
  var timeout_detector = new TimeoutDetector({timeout: argv.interval}); // timeout takes seconds
  timeout_detector.on('error', die);
  outlet = outlet.pipe(timeout_detector);

  if (argv.ttv2) {
    // 3. tweet consolidator -- handles the Buffer->utf8 conversion
    var jsons_to_tweet = new tweet.JSONStoTweet();
    jsons_to_tweet.on('error', die);
    outlet = outlet.pipe(jsons_to_tweet);
    // 4. ttv2 flattener
    var tweet_to_ttv2 = new tweet.TweetToTTV2();
    tweet_to_ttv2.on('error', die);
    outlet = outlet.pipe(tweet_to_ttv2);
  }

  // 5. bzip2 deflater
  // var bzip_stream = new gzbz.BzipDeflater({encoding: 'utf8', level: 9});
  // bzip_stream.on('error', die);
  // outlet = outlet.pipe(bzip_stream)

  if (argv.file == '-') {
    // 6a. destination STDOUT
    process.stdout.on('error', die);
    outlet = outlet.pipe(process.stdout);
  }
  else {
    // 6b. destination file
    var timestamp = new Date().toISOString().replace(/:/g, '-').replace(/\..+/, '');
    var filepath = argv.file.replace(/TIMESTAMP/, timestamp);
    outlet = outlet.pipe(fs.createWriteStream(filepath, {flags: 'a', mode: '0664'}));
  }
}).on('error', die);
