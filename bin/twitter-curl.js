#!/usr/bin/env node
'use strict'; /*jslint es5: true, node: true, indent: 2 */
var fs = require('fs');
var logger = require('winston');
var path = require('path');
var querystring = require('querystring');
var request = require('request');

var Timeout = require('streaming').Timeout;
var twilight = require('..');
var tweet = require('../tweet');


var curl = exports.curl = function(opts) {
  /** curl: start the infinite twitter stream (unless it times out, or people
  quit posting to twitter).

  `opts`: Object
      `timeout`: Integer (optional)
          Hard limit to live.
      `filter`: String (optional)
          Query like "track=this" or "locations=those", etc.
      `oauth`: Object (required)
          `consumer_key`: String
          `consumer_secret`: String
          `token`: String
          `token_secret`: String
      `interval`: Integer (required)
          Die after this many seconds of silence.
      `ttv2`: Boolean (optional)
          Convert into tab-separated TTV2 format

  returns a readable stream
  */
  logger.debug('curl started with options', opts);
  var output = null;

  // pipeline has 6 steps.

  // 1: hard reset timeout (optional)
  if (opts.timeout) {
    setTimeout(function() {
      var err = new Error('Elapsed lifetime of ' + opts.timeout + 's.');
      output.emit('error', err);
      if (output) output.end();
    }, opts.timeout * 1000);
  }

  // 2. used to be get oauth, but we fold that into opts now.

  // 3a. http request
  var request_opts = {
    url: 'https://stream.twitter.com/1.1/statuses/' + (opts.filter ? 'filter.json' : 'sample.json'),
    method: opts.filter ? 'POST' : 'GET',
    form: opts.filter ? querystring.parse(opts.filter) : null,
    oauth: opts.oauth,
  };
  logger.debug(request_opts.method + ' ' + request_opts.url);
  var req = request(request_opts);
  output = req;

  var shutdown = function(err) {
    console.error('shutdown', err);
    req.abort();
    output.end();
  };

  // 3b. http response
  req.on('response', function(response) {
    if (response.statusCode != 200) {
      var body = '';
      response.on('data', function(chunk) {
        body += chunk;
      });
      response.on('end', function() {
        var err = new Error('HTTP Error ' + response.statusCode + ': ' + body);
        shutdown(err);
      });
    }
  });
  // .on('error', shutdown);

  // 4. timeout: ensure we get something every x seconds.
  var timeout_detector = new Timeout(opts.interval); // timeout takes seconds
  // timeout_detector.on('error', shutdown);
  output = output.pipe(timeout_detector);

  if (opts.ttv2) {
    // 5a. tweet consolidator -- handles the Buffer->utf8 conversion
    var jsons_to_tweet = new tweet.JSONStoTweet();
    // jsons_to_tweet.on('error', shutdown);
    output = output.pipe(jsons_to_tweet);
    // 5b. ttv2 flattener
    var tweet_to_ttv2 = new tweet.TweetToTTV2();
    output = output.pipe(tweet_to_ttv2);
    // .on('error', shutdown);
  }

  // 6. return final stream
  return output;
};

var curlCommand = exports.curlCommand = function(argv) {
  /** curlCommand is curl exposed at a slightly lower level so that we can
  more easily test it. (I.e., by environmental variable)
  */
  twilight.getOAuth(argv.accounts, function(err, oauth) {
    if (err) throw err;

    var output = curl({
      oauth: oauth,
      timeout: argv.timeout,
      filter: argv.filter,
      interval: argv.interval,
      ttv2: argv.ttv2,
    });

    // set up destination here, so that testing the curl function is easier.
    if (argv.file == '-') {
      // 7a. destination is STDOUT
      output.pipe(process.stdout);
    }
    else {
      // 7b. destination is a file
      var timestamp = new Date().toISOString().replace(/:/g, '-').replace(/\..+/, '');
      var filepath = argv.file.replace(/TIMESTAMP/, timestamp);
      var fs_stream = fs.createWriteStream(filepath, {flags: 'a', mode: '0664'});
      output.pipe(fs_stream);
    }
  });
};

function main() {
  var full = require('optimist')
    .usage('Usage: twitter-curl --filter "track=bieber"')
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
    console.log(require('../package').version);
  }
  else if (argv.query) {
    full.showHelp();
    logger.error('argument deprecated');
    logger.error('  --query is no longer supported and I am throwing this exception for your own good.');
    process.exit(1);
  }
  else {
    curlCommand(argv);
  }
}

if (require.main === module) { main(); }
