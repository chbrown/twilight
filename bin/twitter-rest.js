#!/usr/bin/env node
/*jslint node: true */
var fs = require('fs');
var https = require('https');
var logger = require('loge');
var path = require('path');
var querystring = require('querystring');
var request = require('request');
var streaming = require('streaming');
var sv = require('sv');
var url = require('url');

var twilight = require('../index');

var rest = exports.rest = function(urlStr, opts, callback) {
  /** rest: make a http(s) call against the Twitter API

  `urlStr`: String
  `opts`: Object
      `method`: String (optional)
      `oauth`: Object
          ... see "twitter-curl.js"
      `timeout`: Number (optional)
      `data`: String (optional)
      `json`: Boolean (optional)
          JSONize output
  `callback`: function(err, readable_stream)
  */
  var urlObj = url.parse(urlStr);
  urlObj.protocol = 'https:';
  urlObj.host = urlObj.hostname = 'api.twitter.com';
  urlObj.pathname = '/1.1' + urlObj.pathname.replace(/^(\/?1\.[01])?/, '');

  var request_opts = {
    url: urlObj,
    method: opts.method,
    oauth: opts.oauth,
    timeout: opts.timeout,
  };

  request_opts[opts.method == 'POST' ? 'form' : 'qs'] = opts.data ? querystring.parse(opts.data) : undefined;
  logger.debug(request_opts.method + ' ' + url.format(request_opts.url));

  request(request_opts).on('response', function(response) {
    if (response.statusCode != 200) {
      var err = new Error('HTTP Error ' + response.statusCode);
      callback(err, response);
    }
    else {
      if (opts.json) {
        response = response
          .pipe(new streaming.json.Parser())
          .pipe(new streaming.json.Stringifier(null, '  '));
      }
      callback(null, response);
    }
  });
};

var restCommand = exports.restCommand = function(argv) {
  twilight.getOAuth(argv.accounts, function(err, oauth) {
    if (err) throw err;

    var urlStr = argv._[0];
    var opts = {
      oauth: oauth,
      method: argv.method,
      timeout: argv.timeout,
      data: argv.data,
      json: argv.json,
    };
    rest(urlStr, opts, function(err, response) {
      if (err) {
        console.error(err);
        return streaming.readToEnd(response, function(err, chunks) {
          logger.debug(chunks.join(''));
        });
      }
      response.pipe(process.stdout);
    });
  });
};

function main() {
  var full = require('optimist')
    .usage('Usage: twitter-rest endpoint')
    .describe({
      method: 'GET or POST',
      data: 'querystring-encoded data to send',
      timeout: 'timeout period (milliseconds)',

      json: 'prettify json output',
      accounts: 'filepath of twitter oauth csv',

      help: 'print this help message',
      verbose: 'print extra output',
      version: 'print version',
    })
    .boolean(['help', 'verbose', 'version'])
    .alias({verbose: 'v', json: 'j'})
    .default({
      method: 'GET',
      accounts: '~/.twitter'
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
    restCommand(argv);
  }
}

if (require.main === module) { main(); }
