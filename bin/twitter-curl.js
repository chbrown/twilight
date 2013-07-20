#!/usr/bin/env node
'use strict'; /*jslint es5: true, node: true */
var fs = require('fs');
var logger = require('winston');
var path = require('path');
var querystring = require('querystring');
var request = require('request');
var sv = require('sv');

var TimeoutDetector = require('../timeout');
var tweet = require('../tweet');

var api_root = 'https://stream.twitter.com/1.1';

function getOAuth(filepath, callback) {
  sv.Parser.readToEnd(filepath, {encoding: 'utf8'}, function(err, accounts) {
    if (err) {
      callback(err);
    }
    else {
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
        // we make slight modifications to the names, because the oauth lib
        //   does not expect the "access_" prefix on the token* keys
        token: account.access_token,
        token_secret: account.access_token_secret,
      };

      logger.debug('Using OAuth: ' + JSON.stringify(oauth));
      callback(err, oauth);
    }
  });
}

function start(argv) {
  var die = function(exc) {
    logger.debug(exc.toString());
    throw exc;
  };

  // pipeline works like:
  // 1: hard reset timeout (optional)
  if (argv.timeout) {
    setTimeout(function() {
      die(new Error('Elapsed lifetime of ' + argv.timeout + 's.'));
    }, argv.timeout * 1000);
  }

  // 2: get oauth account info
  getOAuth(argv.accounts, function(err, oauth) {
    if (err) die(err);

    // 3a. http request
    var outlet;
    if (argv.filter) {
      var form = querystring.parse(argv.filter);
      outlet = request.post(api_root + '/statuses/filter.json', {form: form, oauth: oauth});
    }
    else {
      outlet = request.get(api_root + '/statuses/sample.json', {oauth: oauth});
    }

    // 3b. http response
    outlet.on('response', function(response) {
      if (response.statusCode != 200) {
        response.on('end', function() {
          die(new Error('HTTP Error ' + response.statusCode));
        }).pipe(process.stderr);
      }
    }).on('error', die);

    // 4. timeout: ensure we get something every x seconds.
    var timeout_detector = new TimeoutDetector({timeout: argv.interval}); // timeout takes seconds
    timeout_detector.on('error', die);
    outlet = outlet.pipe(timeout_detector);

    if (argv.ttv2) {
      // 5a. tweet consolidator -- handles the Buffer->utf8 conversion
      var jsons_to_tweet = new tweet.JSONStoTweet();
      jsons_to_tweet.on('error', die);
      outlet = outlet.pipe(jsons_to_tweet);
      // 5b. ttv2 flattener
      var tweet_to_ttv2 = new tweet.TweetToTTV2();
      tweet_to_ttv2.on('error', die);
      outlet = outlet.pipe(tweet_to_ttv2);
    }

    if (argv.file == '-') {
      // 7a. destination STDOUT
      process.stdout.on('error', die);
      outlet = outlet.pipe(process.stdout);
    }
    else {
      // 7b. destination file
      var timestamp = new Date().toISOString().replace(/:/g, '-').replace(/\..+/, '');
      var filepath = argv.file.replace(/TIMESTAMP/, timestamp);
      outlet = outlet.pipe(fs.createWriteStream(filepath, {flags: 'a', mode: '0664'}));
    }
  });
}


function main() {
  var full = require('optimist')
    .usage('Usage: twitter-curl --filter "track=bieber"')
    .alias({v: 'verbose'})
    .describe({
      accounts: 'filepath of twitter oauth csv',
      filter: 'twitter API query',
      file: 'output target (- for STDOUT)',
      interval: 'die after a silence of this many seconds',
      timeout: 'die this many seconds after starting, no matter what (defaults to never)',
      ttv2: 'convert to TTV2 (defaults to false, meaning JSON)',

      help: 'print this help message',
      verbose: 'print extra output',
      version: 'print version',
    })
    .boolean(['help', 'ttv2', 'verbose', 'version'])
    .alias({verbose: 'v'})
    .default({
      interval: 600,
      file: '-',
      accounts: '~/.twitter',
    });

  var argv = full.argv;
  logger.level = argv.verbose ? 'debug' : 'info';

  if (argv.help) {
    full.showHelp();
  }
  else if (argv.version) {
    var package_json_path = path.join(__dirname, '../package.json');
    fs.readFile(package_json_path, 'utf8', function(err, data) {
      var obj = JSON.parse(data);
      console.log(obj.version);
    });
  }
  else if (argv.query) {
    full.showHelp();
    logger.error('argument deprecated');
    logger.error('  --query is no longer supported and I am throwing this exception for your own good.');
    process.exit(1);
  }
  else {
    start(argv);
  }
}

if (require.main === module) { main(); }
