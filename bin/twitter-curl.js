#!/usr/bin/env node
/*jslint node: true */
var fs = require('fs');
var zlib = require('zlib');
var path = require('path');
var stream = require('stream');
var logger = require('loge');
var querystring = require('querystring');
var request = require('request');

var streaming = require('streaming');
var twilight = require('..');
var tweet = require('../tweet');


var curl = exports.curl = function(opts) {
  /** curl: start the infinite twitter stream (unless it times out, or people
  quit posting to twitter).

  `opts`: Object
      `timeout`: Integer (optional)
          Hard limit to live.
      `filter`: String (optional)
          Form like "track=this" or "locations=those", etc.
      `sample`: String (optional)
          Query like "language=en", etc.
      `oauth`: Object (required)
          `consumer_key`: String
          `consumer_secret`: String
          `token`: String
          `token_secret`: String
      `interval`: Integer (required)
          Die after this many seconds of silence.
      `user-agent`: String (optional)
          User-Agent header value to send to Twitter
      `compress`: Boolean (default: false)
          Ask for gzip compression from Twitter
      `decompress`: Boolean (default: true)
          Decompress a gzip-compressed response.
          Not applicable if `compress` == false (or if Twitter decides not to respect the content-encoding header).
          Coerced to true if `ttv2` == true.
      `ttv2`: Boolean (default: false)
          Convert into tab-separated TTV2 format

  returns a stream.Readable() object
  */
  logger.debug('curl started with options', opts);
  // output is what this function returns, and we only pipe into it once.
  var output = new stream.PassThrough();

  // pipeline has 6 steps.

  // 1: http request

  // 1a. prepare headers
  // the User-Agent header is required, if we want to have Twitter respect our accept-encoding value
  var headers = {'User-Agent': opts['user-agent']};
  if (opts.compress) {
    headers['Accept-Encoding'] = 'deflate, gzip';
  }
  // 1b. formulate request
  var req_opts = {
    headers: headers,
    oauth: opts.oauth,
  };
  if (opts.filter) {
    req_opts.url = 'https://stream.twitter.com/1.1/statuses/filter.json';
    req_opts.method = 'POST';
    req_opts.form = querystring.parse(opts.filter);
  }
  else {
    req_opts.url = 'https://stream.twitter.com/1.1/statuses/sample.json';
    req_opts.method = 'GET';
    if (opts.sample) {
      req_opts.qs = querystring.parse(opts.sample);
    }
  }

  // if (opts.cli) {
  //   var curl_cli = ['curl', req_opts.url,
  //     '-H', '"content-type: application/x-www-form-urlencoded; charset=utf-8"',
  //     '-H', 'Authorization: OAuth oauth_consumer_key="xllpWZyC42jL6iQg2M8gQ",oauth_nonce="8c08aeaf1d2c4c61af9182ff078560e7",oauth_signature_method="HMAC-SHA1",oauth_timestamp="1371159851",oauth_token="772224145-hfDlC2qUubxIR8NYtovMkdmRu1x4ROsKkVOb5w0c",oauth_version="1.0",oauth_signature="QW18Aur%2FERy4Prn%2BEJnHQo6i6F0%3D"',
  //     '-H', 'content-length: 30',
  //     '-d', opts.filter,
  //   ];
  // }

  logger.debug(req_opts.method + ' ' + req_opts.url);
  var req = request(req_opts);

  // a little helper function for everything that could go wrong.
  var shutdown = function(err) {
    logger.error('shutdown', err);
    output.emit('error', err);
    output.push(null);
  };

  // 2: hard reset timeout (optional)
  if (opts.timeout && opts.timeout != 'never') {
    setTimeout(function() {
      shutdown(new Error('Elapsed lifetime of ' + opts.timeout + 's.'));
    }, opts.timeout * 1000);
  }

  // 3: listen for http response
  req.on('response', function(response) {
    logger.debug('response.headers:', response.headers);
    // consider every status code != 200 fatal
    if (response.statusCode != 200) {
      return streaming.readToEnd(response, function(err, chunks) {
        if (!err) {
          err = new Error('HTTP Error ' + response.statusCode + ': ' + chunks.join(''));
        }
        shutdown(err);
      });
    }
    // response.on('data', function(chunk) {
    //   console.log('chunk "%s"', chunk.toString());
    // })
    // response.on('error', shutdown);

    // after pulling off the encoding, we don't need anything else about the http response,
    // so it can be incrementally updated with each further step in the pipeline.
    var encoding = response.headers['content-encoding'];

    // 4: decompress if needed / requested
    // this must run from within the response listener since we need the response headers
    if (opts.decompress || opts.ttv2) {
      if (encoding == 'gzip') {
        logger.debug("gunzip'ing HTTP response");
        var gunzip = zlib.createGunzip();
        gunzip.on('error', shutdown);
        response = response.pipe(gunzip);
      }
      else if (encoding == 'deflate') {
        logger.debug('inflating HTTP response');
        var inflate = zlib.createInflate();
        inflate.on('error', shutdown);
        response = response.pipe(inflate);
      }
      else {
        logger.debug('Not wrapping HTTP response with Content-Encoding: %s', encoding);
      }
    }

    // 5. timeout: ensure we get something every x seconds.
    var timeout_detector = new streaming.Timeout(opts.interval); // timeout takes seconds
    // timeout_detector.on('error', shutdown);
    response = response.pipe(timeout_detector);

    // 6: convert to ttv2 (optional)
    if (opts.ttv2) {
      // 6a. tweet consolidator -- handles the Buffer->utf8 conversion
      var jsons_to_tweet = new tweet.JSONStoTweet();
      // jsons_to_tweet.on('error', shutdown);
      response = response.pipe(jsons_to_tweet);
      // 6b. ttv2 flattener
      var tweet_to_ttv2 = new tweet.TweetToTTV2();
      response = response.pipe(tweet_to_ttv2);
      // .on('error', shutdown);
    }
    response.pipe(output);
  });
  // .on('error', shutdown);

  // return PassThrough stream (not immediately hooked up to anything)
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
      sample: argv.sample,
      interval: argv.interval,
      'user-agent': argv['user-agent'],
      compress: argv.compress,
      decompress: argv.decompress,
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
      filter: 'twitter API query for filter endpoint',
      sample: 'twitter API query for sample endpoint',
      file: 'output target (- for STDOUT)',
      interval: 'die after a silence of this many seconds',
      timeout: 'die this many seconds after starting, no matter what',
      'user-agent': 'User-Agent header to send in HTTP request',
      compress: 'request gzip / deflate compression from twitter',
      decompress: "decompress gzip'ed or deflated responses",
      ttv2: 'convert to TTV2 (defaults to false, meaning JSON)',

      help: 'print this help message',
      verbose: 'print extra output',
      version: 'print version',
    })
    .boolean(['help', 'ttv2', 'verbose', 'version'])
    .alias({verbose: 'v'})
    .default({
      interval: 600,
      timeout: 'never',
      compress: false,
      decompress: true,
      file: '-',
      accounts: '~/.twitter',
      'user-agent': 'twilight/twitter-curl',
    });

  var argv = full.argv;
  logger.level = argv.verbose ? 'debug' : 'info';

  if (argv.help) {
    full.showHelp();
  }
  else if (argv.version) {
    console.log(require('../package').version);
  }
  else {
    argv = full.check(function(argv) {
      if (argv.query) {
        throw new Error([
          'argument deprecated.',
          '--query is no longer supported and I am throwing this exception for your own good.',
        ].join(' '));
      }

      if (argv.filter && argv.sample) {
        throw new Error('You cannot specify both --filter and --sample.');
      }
    }).argv;

    curlCommand(argv);
  }
}

if (require.main === module) { main(); }
